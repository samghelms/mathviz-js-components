const THREE = require(`three.min.js`) 

export class Visualization {
	constructor(domEl) {
		this.container = domEl
		this.camera, this.scene, this.renderer
		this.geometry, this.material, this.mesh
		this.domEl = domEl
		this.init = this.init.bind(this)
		this.animate = this.animate.bind(this)

		this.init()
		this.animate()
    }

    init() {
    	this.camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 0.01, 10 );
		this.camera.position.z = 1;

		this.scene = new THREE.Scene();

		this.geometry = new THREE.BoxGeometry( 0.2, 0.2, 0.2 );
		this.material = new THREE.MeshNormalMaterial();

		this.mesh = new THREE.Mesh( this.geometry, this.material );
		this.scene.add( this.mesh );

		this.renderer = new THREE.WebGLRenderer( { antialias: true } );
		this.renderer.setSize( window.innerWidth, window.innerHeight );
		this.domEl.appendChild( this.renderer.domElement );
    }

    animate() {
    	requestAnimationFrame( this.animate );

		this.mesh.rotation.x += 0.01;
		this.mesh.rotation.y += 0.02;

		this.renderer.render( this.scene, this.camera );
    }
}
