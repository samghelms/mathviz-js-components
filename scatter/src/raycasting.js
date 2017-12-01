import {generatePointcloud, generateIndexedPointcloud
		, generateIndexedWithOffsetPointcloud, generateRegularPointcloud} from './generate_point_clouds'
import './TrackballControls'
import './CSS3DRenderer'
import {formatMath} from './helpers'

var table = [
	"\\int_5^5 x", -1, 1, 3,
	"x = 5 + 7", 2, 1, 2,
	"100 * \\frac{5}{6}", 0, 0, 0,
	"\\gamma + \\phi = 5 ", -2, 2, 1
];

const THREE = require(`three.min.js`) 
const Stats = require(`stats.min.js`) 


export class Visualization {
	constructor(domEl) {
		this.container = domEl

		this.camera, this.scene, this.renderer, this.stats
		this.scene_css, this.renderer_css
		this.pointclouds, this.raycaster
		this.mouse = new THREE.Vector2();
		this.intersection = null
		this.spheres = [], this.spheresIndex = 0

		this.table = table
		this.maths = []

		this.clock, this.toggle = 0

		this.controls

		this.threshold = 0.1;
		this.pointSize = 0.05;
		this.width = 150;
		this.length = 150;
		this.rotateY = new THREE.Matrix4().makeRotationY( 0.005 );

		this.init = this.init.bind(this)
		this.animate = this.animate.bind(this)
		this.onWindowResize = this.onWindowResize.bind(this)
		this.onDocumentMouseMove = this.onDocumentMouseMove.bind(this)
		this.onDocumentClick = this.onDocumentClick.bind(this)
		this.animate = this.animate.bind(this)
		this.render = this.render.bind(this)

		this.get_math = this.get_math.bind(this)

		this.init()
		this.animate()
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
			this.maths.push(object)

		}
    }

    init() {
		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color( 0xf0f0f0 );
		this.scene_css = new THREE.Scene();
		//
		this.clock = new THREE.Clock();
		this.camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, .1, 10000 );
		this.camera.position.z = 1000;
		// this.camera.applyMatrix( new THREE.Matrix4().makeTranslation( 0,0,20 ) );
		// this.camera.applyMatrix( new THREE.Matrix4().makeRotationX( -0.5 ) );
		//
		// var pcBuffer = generatePointcloud( new THREE.Color( 1,0,0 ), this.width, this.length, this.pointSize );
		// pcBuffer.scale.set( 10,10,10 );
		// pcBuffer.position.set( -5,0,5 );
		// this.scene.add( pcBuffer );
		var pcIndexed = generateIndexedPointcloud( new THREE.Color( 0,1,0 ), this.width, this.length, this.pointSize );
		pcIndexed.pointcloud.scale.set( 10,10,10 );
		pcIndexed.pointcloud.position.set( 5,0,5 );
		this.scene.add( pcIndexed.pointcloud );
		var pcIndexedOffset = generateIndexedWithOffsetPointcloud( new THREE.Color( 0,1,1 ), this.width, this.length, this.pointSize );
		pcIndexedOffset.scale.set( 10,10,10 );
		pcIndexedOffset.position.set( 5,0,-5 );
		this.scene.add( pcIndexedOffset );
		// var pcRegular = generateRegularPointcloud( new THREE.Color( 1,0,1 ), this.width, this.length, this.pointSize );
		// pcRegular.scale.set( 10,10,10 );
		// pcRegular.position.set( -5,0,-5 );
		// this.scene.add( pcRegular );
		this.pointclouds = [ pcIndexed, pcIndexedOffset ];
		//
		var sphereGeometry = new THREE.SphereGeometry( 0.1, 32, 32 );
		var sphereMaterial = new THREE.MeshBasicMaterial( { color: 0xff0000 } );
		for ( var i = 0; i < 40; i++ ) {
			var sphere = new THREE.Mesh( sphereGeometry, sphereMaterial );
			this.scene.add( sphere );
			this.spheres.push( sphere );
		}
		//
		this.get_math()
		//
		this.renderer_css = new THREE.CSS3DRenderer();
		this.renderer_css.setSize( window.innerWidth, window.innerHeight );
		this.renderer_css.domElement.style.position = 'absolute';
		this.container.appendChild( this.renderer_css.domElement );
		//
		this.renderer = new THREE.WebGLRenderer();
		this.renderer.setPixelRatio( window.devicePixelRatio );
		this.renderer.setSize( window.innerWidth, window.innerHeight );
		this.container.appendChild( this.renderer.domElement );
		this.raycaster = new THREE.Raycaster();
		this.raycaster.params.Points.threshold = this.threshold;
		//
		this.stats = new Stats();
		this.container.appendChild( this.stats.dom );

		//
		window.addEventListener( 'resize', this.onWindowResize, false );
		document.addEventListener( 'mousemove', this.onDocumentMouseMove, false );
		document.addEventListener( 'click', this.onDocumentClick, false );

		this.controls = new THREE.TrackballControls( this.camera, this.renderer_css.domElement );
		//
		this.controls.addEventListener( 'change', this.render );
		this.controls.target.set( 0, 0, 0 );
	}

	onDocumentMouseMove( event ) {
		event.preventDefault();
		this.mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
		this.mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
	}

	onDocumentClick( event ) {
		event.preventDefault();
		console.log("click detected")
		console.log(this.intersections_history)
		console.log(this.toggle)
		if(this.intersections) {
			let xyz = this.intersections[0].point
			this.controls.target.set( xyz["x"], xyz["y"], xyz["z"] );
		}
	}

	onWindowResize() {
		this.camera.aspect = window.innerWidth / window.innerHeight;
		this.camera.updateProjectionMatrix();
		this.renderer.setSize( window.innerWidth, window.innerHeight );
	}
	animate() {
		requestAnimationFrame( this.animate );
		this.render()
		this.stats.update()
		this.controls.update();
	}

	render() {
		// this.camera.applyMatrix( this.rotateY );
		this.camera.updateMatrixWorld();
		// this.raycaster.setFromCamera( this.mouse, this.camera );
		// var intersections = this.raycaster.intersectObjects( this.pointclouds );
		// this.intersections = ( intersections.length ) > 0 ? intersections : null;
		// // console.log(this.intersections)
		// if ( this.toggle > 0.02 && this.intersections !== null) {
		// 	// this.spheres[ this.spheresIndex ].position.copy( this.intersection.point );
		// 	// this.spheres[ this.spheresIndex ].scale.set( 1, 1, 1 );
		// 	// this.spheresIndex = ( this.spheresIndex + 1 ) % this.spheres.length;
		// 	// this.toggle = 0;
		// 	// console.log(this.intersections)
		//     let outer_this = this
		// 	this.intersections.map((int, i) => {
		// 		if(outer_this.maths[i]) {
		// 			outer_this.maths[i].position.copy( int.point );
		// 			outer_this.maths[i].scale.set( .005, .005, .005 );	
		// 		}
		// 	})

		// }
		// for ( var i = 0; i < this.spheres.length; i++ ) {
		// 	var sphere = this.spheres[ i ];
		// 	sphere.scale.multiplyScalar( 0.98 );
		// 	sphere.scale.clampScalar( 0.01, 1 );
		// }
		this.toggle += this.clock.getDelta();
		this.renderer.render( this.scene, this.camera );
		this.renderer_css.render( this.scene_css, this.camera );
	}

}

export default Visualization