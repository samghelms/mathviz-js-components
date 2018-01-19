import Base from './Base'
import sprite from '../data/sprites/disc.png';
const THREE = require(`three.min.js`) 

class BaseScatter extends Base {
	constructor(domEl, data) {
		super(domEl)
		// console.log(data["1904"])
		// 2d viz, this doesn't matter
		this.fov = 90
		// we're working with scientific data, set aspect to 1
		this.aspectRatio = 1
		// we want to be able to zoom really close
		this.near = 0.00001
		// this is arbitrary, all our values should have the same z value
		this.far = 10

		this.width = this.container.offsetWidth, this.height = this.container.offsetHeight
		this.data = data
		this.points, this.pointsMaterial
		this.scaleMax

		this.index2key = {}

		// cosmetic
		this.pointSize = 0.1
		this.sprite = new THREE.TextureLoader().load(sprite)

		this.drawDataPoints = this.drawDataPoints.bind(this)
		this.initBaseScatter = this.initBaseScatter.bind(this)
    }

    init() {
    	this.initBaseScatter()
    }

    initBaseScatter() {
    	// this.camera = new THREE.PerspectiveCamera( this.fov, this.aspectRatio, 0.01, this.far );
    	this.camera = new THREE.PerspectiveCamera( this.fov, this.aspectRatio, this.near, this.far )
    	this.camera.position.set(0, 0, this.far-1);
    	this.camera.lookAt(new THREE.Vector3(0,0,0));

		this.scene = new THREE.Scene()

		// container so the scale is correct
		var pointsContainer = new THREE.Object3D()

		pointsContainer.scale.set( 1, 1, 1 )

		this.drawDataPoints(this.data, this.scene)
		pointsContainer.add(this.points)

		this.scene.add( pointsContainer )

		this.renderer = new THREE.WebGLRenderer( { antialias: true } );
		this.renderer.setSize( this.width, this.height );
		// this.renderer.domElement.style.position = 'absolute'
		this.container.appendChild( this.renderer.domElement );
    }

    animate() {
    	requestAnimationFrame( this.animate );
		this.renderer.render( this.scene, this.camera );
    }

    /* Draws the data points on the scene*/
    drawDataPoints(dataPoints) {
    	/*
		Fills in this.pointsMaterial and this.pointsa
    	*/
        const keys = Object.keys(dataPoints)

        var pts = new Float32Array( keys.length * 3 );
        var index = new Uint16Array( keys.length );

        var i = 0
        var j = 0
        for (let k of keys) {
          let x = parseFloat(dataPoints[k].x)
          let y = parseFloat(dataPoints[k].y)
          let ind = parseInt(k)
          pts[i] = x
          pts[i+1] = y
          pts[i+2] = 0
          index[j] = j
          this.index2key[j] = k

          i+=3, j+=1
        }
        // map/reduce to get the max and normalize; 
		var maxCallback = ( max, cur ) => Math.max( max, cur )
		this.scaleMax = pts.reduce( maxCallback, -Infinity )
        let ptsNormalized = pts.map(x=>x/this.scaleMax)

        var geometry = new THREE.BufferGeometry();
        geometry.addAttribute( 'position', new THREE.BufferAttribute( ptsNormalized, 3 ) );
        geometry.setIndex( new THREE.BufferAttribute( index, 1 ) );
        this.pointsMaterial = new THREE.PointsMaterial( { size: this.pointSize, map: this.sprite, transparent: true } );
        
        this.points = new THREE.Points( geometry, this.pointsMaterial );

    }
}

export default BaseScatter