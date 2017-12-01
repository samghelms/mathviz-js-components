import './TrackballControls'
import './CSS3DRenderer'

const THREE = require(`three.min.js`) 

export class Visualization {
	constructor(domEl) {
		this.container = domEl
		this.camera, this.scene, this.renderer
		this.scene2, this.renderer2

		this.controls

		/* unused*/
		this.geometry, this.material, this.mesh
		this.domEl = domEl
		this.init = this.init.bind(this)
		this.animate = this.animate.bind(this)

		this.init()
		this.animate()
    }

    init() {
    	this.camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 1000 );
		this.camera.position.set( 200, 200, 200 );
		this.controls = new THREE.TrackballControls( this.camera );
		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color( 0xf0f0f0 );
		this.scene2 = new THREE.Scene();
		var material = new THREE.MeshBasicMaterial( { color: 0x000000, wireframe: true, wireframeLinewidth: 1, side: THREE.DoubleSide } );
		//
		for ( var i = 0; i < 10; i ++ ) {
			var element = document.createElement( 'div' );
			element.style.width = '100px';
			element.style.height = '100px';
			element.style.opacity = ( i < 5 ) ? 0.5 : 1;
			element.style.background = new THREE.Color( Math.random() * 0xffffff ).getStyle();
			var object = new THREE.CSS3DObject( element );
			object.position.x = Math.random() * 200 - 100;
			object.position.y = Math.random() * 200 - 100;
			object.position.z = Math.random() * 200 - 100;
			object.rotation.x = Math.random();
			object.rotation.y = Math.random();
			object.rotation.z = Math.random();
			object.scale.x = Math.random() + 0.5;
			object.scale.y = Math.random() + 0.5;
			this.scene2.add( object );
			var geometry = new THREE.PlaneGeometry( 100, 100 );
			var mesh = new THREE.Mesh( geometry, material );
			mesh.position.copy( object.position );
			mesh.rotation.copy( object.rotation );
			mesh.scale.copy( object.scale );
		}
		//
		this.renderer = new THREE.WebGLRenderer();
		this.renderer.setPixelRatio( window.devicePixelRatio );
		this.renderer.setSize( window.innerWidth, window.innerHeight );
		this.container.appendChild( this.renderer.domElement );
		
		this.renderer2 = new THREE.CSS3DRenderer();
		this.renderer2.setSize( window.innerWidth, window.innerHeight );
		this.renderer2.domElement.style.position = 'absolute';
		this.renderer2.domElement.style.top = 0;
		this.container.appendChild( this.renderer2.domElement );
    }

    animate() {
    	requestAnimationFrame( this.animate );
		this.controls.update();
		this.renderer.render( this.scene, this.camera );
		this.renderer2.render( this.scene2, this.camera );
		this.renderer.render( this.scene, this.camera );
    }
}
