import './OrbitControls'
const THREE = require(`three.min.js`) 
const dat = require(`dat.gui.min.js`) 
const Stats = require(`stats.min.js`) 

export class Visualization {
	constructor(domEl) {
		this.width = 600
		this.height = 600
		this.pixelRatio = window.devicePixelRatio

		this.group;
		this.container = domEl
		this.stats;
		this.particlesData = [];
		this.camera, this.scene, this.renderer;
		this.positions, this.colors;
		this.particles;
		this.pointCloud;
		this.particlePositions;
		this.linesMesh;
		this.maxParticleCount = 1000;
		this.particleCount = 500;
		this.r = 800;
		this.rHalf = this.r / 2;
		this.effectController = {
			showDots: true,
			showLines: true,
			minDistance: 150,
			limitConnections: false,
			maxConnections: 20,
			particleCount: 500
		};

		this.initGUI = this.initGUI.bind(this);
		this.init = this.init.bind(this)
		this.onWindowResize = this.onWindowResize.bind(this)
		this.animate = this.animate.bind(this)
		this.render = this.render.bind(this)

		this.container = domEl

		this.init();
		this.animate();

    }
    initGUI() {
		this.gui = new dat.GUI();
		var outer_this = this
		this.gui.add( this.effectController, "showDots" ).onChange( function( value ) { outer_this.pointCloud.visible = value; } );
		this.gui.add( this.effectController, "showLines" ).onChange( function( value ) { outer_this.linesMesh.visible = value; } );
		this.gui.add( this.effectController, "minDistance", 10, 300 );
		this.gui.add( this.effectController, "limitConnections" );
		this.gui.add( this.effectController, "maxConnections", 0, 30, 1 );
		this.gui.add( this.effectController, "particleCount", 0, this.maxParticleCount, 1 ).onChange( function( value ) {
			outer_this.particleCount = parseInt( value );
			outer_this.particles.setDrawRange( 0, outer_this.particleCount );
		});
	}

    init() {
		this.initGUI();
		this.camera = new THREE.PerspectiveCamera( 45, this.width / this.height, 1, 4000 );
		this.camera.position.z = 1750;

		var controls = new THREE.OrbitControls( this.camera, this.container );
		this.scene = new THREE.Scene();
		this.group = new THREE.Group();
		this.scene.add( this.group );

		// var helper = new THREE.BoxHelper( new THREE.Mesh( new THREE.BoxGeometry( this.r, this.r, this.r ) ) );
		// helper.material.color.setHex( 0x080808 );
		// helper.material.blending = THREE.AdditiveBlending;
		// helper.material.transparent = true;
		// this.group.add( helper );

		var segments = this.maxParticleCount * this.maxParticleCount;
		this.positions = new Float32Array( segments * 3 );
		this.colors = new Float32Array( segments * 3 );

		var pMaterial = new THREE.PointsMaterial( {
			color: 0xFFFFFF,
			size: 3,
			blending: THREE.AdditiveBlending,
			transparent: true,
			sizeAttenuation: false
		} );
		this.particles = new THREE.BufferGeometry();
		this.particlePositions = new Float32Array( this.maxParticleCount * 3 );

		for ( var i = 0; i < this.maxParticleCount; i++ ) {
			var x = Math.random() * this.r - this.r / 2;
			var y = Math.random() * this.r - this.r / 2;
			var z = Math.random() * this.r - this.r / 2;
			this.particlePositions[ i * 3     ] = x;
			this.particlePositions[ i * 3 + 1 ] = y;
			this.particlePositions[ i * 3 + 2 ] = z;
			// add it to the geometry
			this.particlesData.push( {
				velocity: new THREE.Vector3( -1 + Math.random() * 2, -1 + Math.random() * 2,  -1 + Math.random() * 2 ),
				numConnections: 0
			} );
		}
		
		this.particles.setDrawRange( 0, this.particleCount );
		this.particles.addAttribute( 'position', new THREE.BufferAttribute( this.particlePositions, 3 ).setDynamic( true ) );
		// create the particle system
		this.pointCloud = new THREE.Points( this.particles, pMaterial );
		this.group.add( this.pointCloud );
		var geometry = new THREE.BufferGeometry();
		geometry.addAttribute( 'position', new THREE.BufferAttribute( this.positions, 3 ).setDynamic( true ) );
		geometry.addAttribute( 'color', new THREE.BufferAttribute( this.colors, 3 ).setDynamic( true ) );
		geometry.computeBoundingSphere();
		geometry.setDrawRange( 0, 0 );
		var material = new THREE.LineBasicMaterial( {
			vertexColors: THREE.VertexColors,
			blending: THREE.AdditiveBlending,
			transparent: true
		} );
		this.linesMesh = new THREE.LineSegments( geometry, material );
		this.group.add( this.linesMesh );
		//
		this.renderer = new THREE.WebGLRenderer( { antialias: true } );
		this.renderer.setPixelRatio( this.pixelRatio );
		this.renderer.setSize( this.width, this.height );
		this.renderer.gammaInput = true;
		this.renderer.gammaOutput = true;
		this.container.appendChild( this.renderer.domElement );
		//
		this.stats = new Stats();
		this.container.appendChild( this.stats.dom );
		window.addEventListener( 'resize', this.onWindowResize, false );
	}

    onWindowResize() {
    	console.log(this.camera)
		this.camera.aspect = this.width / this.height;
		this.camera.updateProjectionMatrix();
		this.renderer.setSize( this.width, this.height );
	}

	animate() {
		var vertexpos = 0;
		var colorpos = 0;
		var numConnected = 0;
		for ( var i = 0; i < this.particleCount; i++ )
			this.particlesData[ i ].numConnections = 0;
		for ( var i = 0; i < this.particleCount; i++ ) {
			// get the particle
			var particleData = this.particlesData[i];
			this.particlePositions[ i * 3     ] += particleData.velocity.x;
			this.particlePositions[ i * 3 + 1 ] += particleData.velocity.y;
			this.particlePositions[ i * 3 + 2 ] += particleData.velocity.z;
			if ( this.particlePositions[ i * 3 + 1 ] < -this.rHalf || this.particlePositions[ i * 3 + 1 ] > this.rHalf )
				particleData.velocity.y = -particleData.velocity.y;
			if ( this.particlePositions[ i * 3 ] < -this.rHalf || this.particlePositions[ i * 3 ] > this.rHalf )
				particleData.velocity.x = -particleData.velocity.x;
			if ( this.particlePositions[ i * 3 + 2 ] < -this.rHalf || this.particlePositions[ i * 3 + 2 ] > this.rHalf )
				particleData.velocity.z = -particleData.velocity.z;
			if ( this.effectController.limitConnections && particleData.numConnections >= this.effectController.maxConnections )
				continue;
			// Check collision
			for ( var j = i + 1; j < this.particleCount; j++ ) {
				var particleDataB = this.particlesData[ j ];
				if ( this.effectController.limitConnections && particleDataB.numConnections >= this.effectController.maxConnections )
					continue;
				var dx = this.particlePositions[ i * 3     ] - this.particlePositions[ j * 3     ];
				var dy = this.particlePositions[ i * 3 + 1 ] - this.particlePositions[ j * 3 + 1 ];
				var dz = this.particlePositions[ i * 3 + 2 ] - this.particlePositions[ j * 3 + 2 ];
				var dist = Math.sqrt( dx * dx + dy * dy + dz * dz );
				if ( dist < this.effectController.minDistance ) {
					particleData.numConnections++;
					particleDataB.numConnections++;
					var alpha = 1.0 - dist / this.effectController.minDistance;
					this.positions[ vertexpos++ ] = this.particlePositions[ i * 3     ];
					this.positions[ vertexpos++ ] = this.particlePositions[ i * 3 + 1 ];
					this.positions[ vertexpos++ ] = this.particlePositions[ i * 3 + 2 ];
					this.positions[ vertexpos++ ] = this.particlePositions[ j * 3     ];
					this.positions[ vertexpos++ ] = this.particlePositions[ j * 3 + 1 ];
					this.positions[ vertexpos++ ] = this.particlePositions[ j * 3 + 2 ];
					this.colors[ colorpos++ ] = alpha;
					this.colors[ colorpos++ ] = alpha;
					this.colors[ colorpos++ ] = alpha;
					this.colors[ colorpos++ ] = alpha;
					this.colors[ colorpos++ ] = alpha;
					this.colors[ colorpos++ ] = alpha;
					numConnected++;
				}
			}
		}
		this.linesMesh.geometry.setDrawRange( 0, numConnected * 2 );
		this.linesMesh.geometry.attributes.position.needsUpdate = true;
		this.linesMesh.geometry.attributes.color.needsUpdate = true;
		this.pointCloud.geometry.attributes.position.needsUpdate = true;
		requestAnimationFrame( this.animate );
		this.stats.update();
		this.render();
	}

	render() {
		var time = Date.now() * 0.001;
		this.group.rotation.y = time * 0.1;
		this.renderer.render( this.scene, this.camera );
	}
}
