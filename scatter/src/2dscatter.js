import './CSS3DRenderer'
import './threeoctree.min.js'
import {formatMath} from './helpers'
import {generateIndexedPointcloud} from './generate_point_clouds'
import formula_list from './data/formula_list.json'
import sprite from './data/sprites/disc.png';

import tsne_embeddings from './data/tnse_embeddings_dev.json'

const Stats = require(`stats.min.js`) 
const THREE = require(`three.min.js`) 
const d3 = require(`d3.v4.min.js`)

// Point generator function
function raw_points_buffer(radius, width, height, n) {
  const theta = Math.PI * (3 - Math.sqrt(5));
  var i = 0
  var pts = new Float32Array( n * 3 );
  for (var i = 0; i < 3*n; i+=3 ) {
    const r = radius * Math.sqrt(i), a = theta * i;
    pts[i] = width / 2 + r * Math.cos(a) - width / 2
    pts[i+1] = height / 2 + r * Math.sin(a) - height / 2
    pts[i+2] = 0
  }
  return pts
}


export class Visualization {
  constructor(domEl) {

    this.tsne_data = tsne_embeddings

    this.table = formula_list
    this.mathct = 0
    this.oldMath, this.old_index
    this.raw_points
    this.particles
    this.default_point_size = 0.5
    this.max_intersections = 20
    this.mathScale = 0.01
    this.center = {x:0.0, y:0.0}

    this.zoomed_height
    this.zoomed_width

    this.search_radius = 80
    this.octree = new THREE.Octree(
                                  {
                                    objectsThreshold: 1,
                                  }
                                  )
    this.sprite = new THREE.TextureLoader().load( sprite );
    this.active_indices = []
    this.mathObjs = {}
    this.id2word = {}

    this.container = domEl
    this.camera, this.scene, this.renderer, this.zoom
    this.scene_css, this.renderer_css
    this.raycaster
    this.mouse = new THREE.Vector2();
    this.intersection = null
    
    this.width = window.innerWidth
    this.height = window.innerHeight

    this.stats

    this.near_plane = .1
    this.far_plane = 50
    this.maths = []

    this.points, this.pointsMaterial

    this.init = this.init.bind(this)
    this.animate = this.animate.bind(this)
    this.fetchData = this.fetchData.bind(this)
    this.setupZoom = this.setupZoom.bind(this)
    this.render = this.render.bind(this)
    this.onDocumentMouseMove = this.onDocumentMouseMove.bind(this)
    this.addMath = this.addMath.bind(this)
    this.drawBufferDataTsne = this.drawBufferDataTsne.bind(this)
    this.removeInactiveMath = this.removeInactiveMath.bind(this)
    this.getIntersections = this.getIntersections.bind(this)
    this.findIntersections = this.findIntersections.bind(this)
    this.computeBoundingBox = this.computeBoundingBox.bind(this)

    this.init()
    this.animate()
    }

    init() {
      this.initBaseScatter()
      
      this.setupZoom()

      const view = d3.select(this.renderer_css.domElement);
      view.call(this.zoom);
      // Disable double click to zoom because I'm not handling it in Three.js
      view.on('dblclick.zoom', null);
      // Sync d3 zoom with camera z position
      this.zoom.scaleTo(view, this.far_plane);

      document.addEventListener( 'mousemove', this.onDocumentMouseMove, false );
    
    }

    fetchData() {
      
      this.drawBufferDataTsne()
 
    }

    addMath(math, id, x, y) {
      // Don't need to re render things we already have
      if (this.active_indices.includes(id) ) {
        return
      }
      console.log("madeit")
      var element = document.createElement( 'div' );
      //
      formatMath(math.tex, element)
      element.className = 'element';
      var object = new THREE.CSS3DObject( element );
      object.position.x = x
      object.position.y = y
      object.position.z = 0 ;
      console.log(this.mathScale)
      const scale = this.mathScale * this.camera.z
      console.log(this.camera.z)
      object.scale.set( scale, scale, scale );  
      this.scene_css.add( object );
      this.mathObjs[id] = object
      
    }

    removeInactiveMath(oldMath, newMath) {
      let removeMath = oldMath.filter(x => !newMath.includes(x))
      for (let i of removeMath) {
        this.scene_css.remove(this.mathObjs[i])
        this.mathObjs[i] = null
      }
    }

    drawBufferDataTsne() {
        const keys = Object.keys(this.tsne_data)

        var pts = new Float32Array( keys.length * 3 );
        var index = new Uint16Array( keys.length );
        var color = new THREE.Color();

        this.points_index = []

        var i = 0
        var j = 0
        for (let k of keys) {
          let x = parseFloat(this.tsne_data[k].x)
          let y = parseFloat(this.tsne_data[k].y)
          let ind = parseInt(k)
          pts[i] = x
          pts[i+1] = y
          pts[i+2] = 0
          index[j] = j

          this.id2word[j] = {key: k, x: x, y: y}
          this.octree.add( {x: x, y: y, z: 0, radius: 0.1, id: j })

          i+=3, j+=1
        }

        var geometry = new THREE.BufferGeometry();
        geometry.addAttribute( 'position', new THREE.BufferAttribute( pts, 3 ) );
        geometry.setIndex( new THREE.BufferAttribute( index, 1 ) );
        //
        this.pointsMaterial = new THREE.PointsMaterial( { size: this.default_point_size, map: this.sprite, transparent: true } );
        this.pointsMaterial.color.setHSL( 1.0, 0.3, 0.1 );
        
        this.particles = new THREE.Points( geometry, this.pointsMaterial );

        this.scene.add( this.particles );
    }

    computeBoundingBox() {
      /*
      Computes the bounding box of the points currently displayed.
      Also updates the search radius
      */
      const vFOV = this.camera.fov * Math.PI / 180
      this.zoomed_height = 2 * Math.tan( vFOV / 2 ) * this.camera.position.z
      // assuming we have a square view
      this.zoomed_width = this.zoomed_height
      this.search_radius = this.zoomed_height / 2
    }

    setupZoom() {
      const outer_this = this

      this.zoom = d3.zoom()
      .scaleExtent([outer_this.near_plane, outer_this.far_plane])
      .wheelDelta(function wheelDelta() {
        // this inverts d3 zoom direction, which makes it the rith zoom direction for setting the camera
        return d3.event.deltaY * (d3.event.deltaMode ? 120 : 1) / 500;
      })
      .on('zoom', () => {
        const event = d3.event;
        if (event.sourceEvent) {

          // Get z from D3
          const new_z = event.transform.k;
         
          if (new_z !== outer_this.camera.position.z) {
            
            // Handle a zoom event
            const { clientX, clientY } = event.sourceEvent;

            // Project a vector from current mouse position and zoom level
            // Find the x and y coordinates for where that vector intersects the new
            // zoom level.
            // Code from WestLangley https://stackoverflow.com/questions/13055214/mouse-canvas-x-y-to-three-js-world-x-y-z/13091694#13091694
            const vector = new THREE.Vector3(
              clientX / outer_this.width * 2 - 1,
              - (clientY / outer_this.height) * 2 + 1,
              1 
            );
            vector.unproject(outer_this.camera);
            const dir = vector.sub(outer_this.camera.position).normalize();
            const distance = (new_z - outer_this.camera.position.z)/dir.z;
            const pos = outer_this.camera.position.clone().add(dir.multiplyScalar(distance));

            this.center = {x: pos.x, y: pos.y}

            let scale
            
            if (outer_this.camera.position.z < this.far_plane) {
              scale = (outer_this.camera.position.z)/this.far_plane*(1+2*(this.far_plane- (outer_this.camera.position.z))/this.far_plane);
              outer_this.pointsMaterial.setValues({size: outer_this.default_point_size*scale});
            } else if (outer_this.camera.position.z >= this.far_plane && outer_this.pointsMaterial.size !== outer_this.default_point_size) {
              outer_this.pointsMaterial.setValues({size: outer_this.default_point_size});
            }
                            
            // Set the camera to new coordinates
            outer_this.camera.position.set(pos.x, pos.y, new_z);

          } else {

            // Handle panning
            const { movementX, movementY } = event.sourceEvent;

            // Adjust mouse movement by current scale and set camera
            const current_scale = outer_this.getCurrentScale();
            outer_this.camera.position.set(outer_this.camera.position.x - movementX/current_scale, outer_this.camera.position.y +
              movementY/current_scale, outer_this.camera.position.z);
          }
        }
      });

    }

    getIntersections() {
      /*
      gets intersections and performs thinning on the intersections if needed
      */
      this.raycaster.setFromCamera( this.mouse, this.camera );
      const intersections = this.raycaster.intersectObject( this.particles );
      const closest = {x: this.center.x, y: this.center.y} 
      console.log(closest)
      console.log(intersections)

      let neighbors = this.octree.search( {x: closest.x, y: closest.y, z: 0}, this.search_radius )
      if ( neighbors.length <= this.max_intersections ) {
        neighbors = neighbors
      } else {
        let inc = this.zoomed_height/8.0
        neighbors = []
        let sample = []
        let results
        for (let x = closest.x - this.zoomed_height/2, y = closest.x - this.zoomed_height/2; x < this.zoomed_height/2; x+=inc, y+=inc) {
          results = this.octree.search( {x: x, y: y, z: 0}, 10 ) 
          neighbors.push(results[0])
        }
      }
      return neighbors
    }

    findIntersections() {
      let intersections = this.getIntersections()

      if (intersections.length > 1) {
        let new_active_indices = []
        let word
        let real_id

        for(var i = 0; i < intersections.length; i++) {
          real_id = intersections[i] ? intersections[i].object.id: null
          
          if (real_id) {
            word = this.id2word[real_id]
            this.addMath( this.tsne_data[ word.key ], real_id, word.x, word.y )
            new_active_indices.push(real_id)
          }
                  
        } 
        this.removeInactiveMath(this.active_indices, new_active_indices)
        this.active_indices = new_active_indices

      }
    }

    onDocumentMouseMove( event ) {
      event.preventDefault();
      this.mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
      this.mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
    }

    getCurrentScale() {
      var vFOV = this.camera.fov * Math.PI / 180
      var scale_height = 2 * Math.tan( vFOV / 2 ) * this.camera.position.z
      var currentScale = this.height / scale_height
      return currentScale
    }

    render() {
      this.renderer.render(this.scene, this.camera);
      this.renderer_css.render( this.scene_css, this.camera );
    }

    animate() {
      requestAnimationFrame(this.animate);
      this.render()

      this.findIntersections()

      this.stats.update()
      this.octree.update()
      this.computeBoundingBox()
    }
}