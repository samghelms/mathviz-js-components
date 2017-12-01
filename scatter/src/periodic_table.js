import './TrackballControls'
import './CSS3DRenderer'
import {formatMath} from './helpers'

var TWEEN = require('@tweenjs/tween.js');
const THREE = require(`three.min.js`) 

var table = [
	"\\int_5^5 x", 1, 1, 3,
	"x = 5 + 7", 2, 1, 2,
	"100 * \\frac{5}{6}", 0, 0, 0,
	"\\gamma + \\phi = 5 ", -2, 2, 1
];

function generatePointCloudGeometry( color, width, length ){
	var geometry = new THREE.BufferGeometry();
	var numPoints = width*length;
	var positions = new Float32Array( numPoints*3 );
	var colors = new Float32Array( numPoints*3 );
	var k = 0;
	for( var i = 0; i < width; i++ ) {
		for( var j = 0; j < length; j++ ) {
			var u = i / width;
			var v = j / length;
			var x = u - 0.5;
			var y = ( Math.cos( u * Math.PI * 8 ) + Math.sin( v * Math.PI * 8 ) ) / 20;
			var z = v - 0.5;
			positions[ 3 * k ] = x;
			positions[ 3 * k + 1 ] = y;
			positions[ 3 * k + 2 ] = z;
			var intensity = ( y + 0.1 ) * 5;
			colors[ 3 * k ] = color.r * intensity;
			colors[ 3 * k + 1 ] = color.g * intensity;
			colors[ 3 * k + 2 ] = color.b * intensity;
			k++;
		}
	}
	geometry.addAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );
	geometry.addAttribute( 'color', new THREE.BufferAttribute( colors, 3 ) );
	geometry.computeBoundingBox();
	return geometry;
}

function generatePointcloud( color, width, length ) {
	var pointSize = 0.5;
	var width = 1000;
	var length = 1000;
	var geometry = generatePointCloudGeometry( color, width, length );
	var material = new THREE.PointsMaterial( { size: pointSize, vertexColors: THREE.VertexColors } );
	var pointcloud = new THREE.Points( geometry, material );
	return pointcloud;
}

export class Visualization {
	constructor(domEl) {

		this.table = table
		this.container = domEl
		this.camera, this.scene_css, this.renderer_css
		this.scene, this.renderer, this.group

		this.rayCaster, this.mouse, this.intersects, this.threshold
		this.PARTICLE_SIZE = 30

		this.particles, this.particlePositions, this.particlesData = []
		this.maxParticleCount = 1000, this.particleCount = 1000, this.r = 800;

		this.objects = []
		this.spheres = [], this.spheresIndex = 0

		this.intersected, this.intersectColor = 0x00D66B, this.baseColor = 0x333333;

		this.controls

		this.toggle = 0, this.clock

		/* unused*/
		this.geometry, this.material, this.mesh
		this.domEl = domEl
		this.init = this.init.bind(this)
		this.animate = this.animate.bind(this)
		this.render = this.render.bind(this)
		this.onWindowResize = this.onWindowResize.bind(this)
		this.get_dots2 = this.get_dots2.bind(this)
		this.get_math = this.get_math.bind(this)
		this.onDocumentMouseMove = this.onDocumentMouseMove.bind(this)
		this.get_spheres = this.get_spheres.bind(this)

		this.init()
		this.animate()
    }

    get_dots2() {
    	var width = 1000;
		var length = 1000;
    	this.pointCloud = generatePointcloud( new THREE.Color( 1,0,0 ), width, length );
		this.pointCloud.scale.set( 1000,1000,1000 );
		this.pointCloud.position.set( -5,0,5 );
		this.scene.add( this.pointCloud );
    }

    get_math() {
    	for ( var i = 0; i < this.table.length; i += 4 ) {
			var element = document.createElement( 'div' );
			//
			formatMath(this.table[i], element)
			element.className = 'element';
			var object = new THREE.CSS3DObject( element );
			object.position.x = ( this.table[ i + 1 ] * 140 ) ;
			object.position.y = - ( this.table[ i + 2 ] * 180 ) + 500;
			object.position.z = ( this.table[ i + 1 ] * 180 ) ;
			this.scene_css.add( object );
			this.objects.push( object );

		}
    }

    get_spheres() {
    	var sphereGeometry = new THREE.SphereGeometry( 0.1, 32, 32 );
		var sphereMaterial = new THREE.MeshBasicMaterial( { color: 0xff0000 } );
		for ( var i = 0; i < 40; i++ ) {
			var sphere = new THREE.Mesh( sphereGeometry, sphereMaterial );
			this.scene.add( sphere );
			this.spheres.push( sphere );
		}
    }

    init() {
    	this.camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 1, 10000 );
		this.camera.position.z = 1000;
		this.scene_css = new THREE.Scene();
		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color( 0xf0f0f0 );
		this.clock = new THREE.Clock();
		//
		this.rayCaster = new THREE.Raycaster();
		this.rayCaster.params.Points.threshold = this.threshold;
    	this.mouse = new THREE.Vector2();
		//
		this.get_math()
		// this.get_dots()
		// this.get_dots_real()
		this.get_dots2()
		// this.get_spheres()
		//
		this.renderer_css = new THREE.CSS3DRenderer();
		this.renderer_css.setSize( window.innerWidth, window.innerHeight );
		this.renderer_css.domElement.style.position = 'absolute';
		this.container.appendChild( this.renderer_css.domElement );
		//
		this.controls = new THREE.TrackballControls( this.camera, this.renderer_css.domElement );
		this.controls.rotateSpeed = 0.5;
		this.controls.minDistance = 500;
		this.controls.maxDistance = 6000;
		this.controls.addEventListener( 'change', this.render );
		
		this.renderer = new THREE.WebGLRenderer( { antialias: true } );
		this.renderer.setPixelRatio( window.devicePixelRatio );
		this.renderer.setSize( window.innerWidth, window.innerHeight );
		this.renderer.gammaInput = true;
		this.renderer.gammaOutput = true;
		this.container.appendChild( this.renderer.domElement );
		
		window.addEventListener( 'resize', this.onWindowResize, false );
		document.addEventListener( 'mousemove', this.onDocumentMouseMove, false );

		this.render()

    }

	onWindowResize() {
		this.camera.aspect = window.innerWidth / window.innerHeight;
		this.camera.updateProjectionMatrix();
		this.renderer_css.setSize( window.innerWidth, window.innerHeight );
		this.renderer.setSize( window.innerWidth, window.innerHeight );

		this.render()
	}

	onDocumentMouseMove( event ) {
		event.preventDefault();
		this.mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
		this.mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

		this.rayCaster.setFromCamera( this.mouse, this.camera );
		console.log("raycaster========")
		console.log(this.rayCaster)
		let intersects = this.rayCaster.intersectObjects([ this.pointCloud ]);
		console.log(intersects)

	}

    animate() {
    	requestAnimationFrame( this.animate );
		this.controls.update();
    }

    render() {
 		// for ( var i = 0; i < intersects.length; i++ ) {

		// 	intersects[ i ].object.material.color.set( 0x000000 );

		// }

		this.renderer_css.render( this.scene_css, this.camera );
    	this.renderer.render( this.scene, this.camera );
    }
}