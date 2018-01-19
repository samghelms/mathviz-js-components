/*
Only works with zoomable scatters for now, although I have designed 
with the thought of a scatter factory.

If box boundaries change more than 25%, refresh
*/
import ZoomableScatter from './ZoomableScatter'
import '../threeoctree.min.js'
import '../CSS3DRenderer'

const THREE = require(`three.min.js`) 
const d3 = require(`d3.v4.min.js`)

class LabeledScatter extends ZoomableScatter {
	constructor(domEl, data, labelFormatter) {
		super(domEl, data, false)
		this.labelFormatter = labelFormatter

		this.octree = new THREE.Octree({radius: this.near, objectsThreshold: 1})
		this.activeLabels = {}
		this.scaleAdjustment = 0.004
		this.rePopulateThreshold = 0.2
		this.prevCenter = {x:0, y:0}
		this.data = data

		this.fontSize = 5

		this.initLabels = this.initLabels.bind(this)
		this.initOctree = this.initOctree.bind(this)
		this.createLabel = this.createLabel.bind(this)
		this.labelZoom = this.labelZoom.bind(this)
		this.combinedZoom = this.combinedZoom.bind(this)
		this.resizeLabels = this.resizeLabels.bind(this)
		this.populateLabels = this.populateLabels.bind(this)
		this.getCurrentWidth=this.getCurrentWidth.bind(this)
		this.removeLabels=this.removeLabels.bind(this)
		this.handleLabelsTransition=this.handleLabelsTransition.bind(this)
    }

    init() {
    	// TODO: is this the best way to initialize? 
    	// This seems to be the composition pattern?
    	this.initBaseScatter()
    	this.initLabels()
    	this.initZoomableScatter()
    }

    initLabels() {
    	this.rendererCSS = new THREE.CSS3DRenderer()
		this.rendererCSS.setSize(this.width, this.height)
		this.rendererCSS.domElement.style.position = 'absolute'
		this.rendererCSS.domElement.style.top = 0;
		this.container.appendChild( this.rendererCSS.domElement )

		this.sceneCSS = new THREE.Scene()

		this.initOctree()	    

		this.lastZ = this.camera.position.z
    }

    initOctree() {
        var i = 0
        var j = 0
        const points_arr = this.points.geometry.attributes.position.array
        while (i < points_arr.length) {
          this.octree.add( {x: points_arr[i], y: points_arr[i+1], z: 0, radius: this.near, id: j })
          i+=3, j+=1
        }
        this.octree.update()
    }

    createLabel(label, x, y) {
      var el = this.labelFormatter(label)
      el.className = 'element'
      var obj = new THREE.CSS3DObject( el )
      obj.position.x = x
      obj.position.y = y
      obj.position.z = 0
      const scale = this.getPointScale() * this.scaleAdjustment
      obj.scale.set(scale, scale, scale );  
      return obj
    }

    removeLabels(keys) {
    	const remove = (key) => {
    		if(Object.keys(this.activeLabels).includes(key) && !keys.includes(key) ) {
    			this.sceneCSS.remove(this.activeLabels[key])
    			delete this.activeLabels[key]
    		}
    	} 
    	Object.keys(this.activeLabels).map(k=>remove(k))
    }

    animate() {
    	requestAnimationFrame( this.animate );
		this.renderer.render( this.scene, this.camera );
		this.rendererCSS.render( this.sceneCSS, this.camera );
    }

    setupZoom() {
	    const outerThis = this
	    const zoom = d3.zoom()
	    .scaleExtent([outerThis.near, outerThis.far-1])
	    .wheelDelta(function wheelDelta() {
	      // this inverts d3 zoom direction, which makes it the rith zoom direction for setting the camera
	      return d3.event.deltaY * (d3.event.deltaMode ? 120 : 1) / 500;
	    })
	    .on('zoom', this.combinedZoom);
	    return zoom
	}

	combinedZoom() {
		this.labelZoom()
		this.scatterZoom()
	}

	handleLabelsTransition() {
		const w = this.getCurrentWidth()/2
		const x = this.camera.position.x
        const y = this.camera.position.y
        console.log(w)
        console.log(x)
        console.log(y)

		const allMatches = this.octree.search({x:x, y:y}, w)
		const keys = allMatches.map(el=>this.index2key[el.object["id"]])
		const randomSubset = d3.shuffle(keys).slice(0,7)
		console.log(randomSubset)
		this.removeLabels(randomSubset)
        this.populateLabels(randomSubset)
	}

    labelZoom() {
      const event = d3.event;
      if (event.sourceEvent) {
        const newZ = event.transform.k
        if (newZ !== this.camera.position.z && newZ < this.far) {
        	// resize labels
        	this.resizeLabels()
        	// Flag repopulation 
        	if(Math.abs(newZ-this.lastZ)/this.lastZ > this.rePopulateThreshold) {
        		this.handleLabelsTransition()
        		this.lastZ = this.camera.position.z
        	}
        } else {
          // Handle panning
          const { movementX, movementY } = event.sourceEvent;
          // Adjust mouse movement by current scale and set camera
          const diffCalc = (prev, curr, w) => {
          	return (((prev.x-curr.x)**2+(prev.y-curr.y)**2)**0.5)/w
          }
          const current_scale = this.getCurrentScale();
          const currCenter = {x: this.camera.position.x, y: this.camera.position.y}
          const currW = this.getCurrentWidth()
          const diff = diffCalc(this.prevCenter, currCenter, currW)
          if( diff > this.rePopulateThreshold) {
          	this.handleLabelsTransition()
        	this.prevCenter = currCenter
          }

        }
      }
    }

    resizeLabels() {
    	/*
		* resizes labels to a given scale
    	*/
        const labels = this.activeLabels
        const scale = this.getPointScale() * this.scaleAdjustment
        Object.keys(labels).map(k=>labels[k].scale.set(scale, scale,  scale) )  
    }

    populateLabels(keys) {
		const add2Scene = (k) => {
			if(!Object.keys(this.activeLabels).includes(k)) {
				const l = this.data[k]
				const label = this.createLabel(l["tex"], l["x"]/this.scaleMax, l["y"]/this.scaleMax)
				this.sceneCSS.add( label )
				this.activeLabels[k] = label
			}
		}

		keys.map(k=>add2Scene(k))
    }

    getCurrentWidth() {
    	const vFOV = this.camera.fov * Math.PI / 180
	    const width = 2 * Math.tan( vFOV / 2 ) * this.camera.position.z
	    return width
    }
}

export default LabeledScatter