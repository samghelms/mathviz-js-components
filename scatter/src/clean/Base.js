/*
Contains the base settings for the scatter plot graphics.
The Scatter plot will inheret this class.
Allows the code to be cleaner and more flexible.
*/

class Base {
	/* Initializes constants */
	constructor(domEl) {
		this.container = domEl
		this.camera, this.scene, this.renderer
		this.geometry, this.material, this.mesh

		/* interface functions */
		this.init = this.init.bind(this)
		this.animate = this.animate.bind(this)
	}

	/**
     * Interface for running the visualization. 
     * Note that Base cannot be instantiated.
     */
    run() {
       this.init()
       this.animate()
    }

	/**
     * Virtual function. 
     * Tells the visualization how to set itself up.
     */
    init() {
       throw new Error('You have to implement the method init!');
    }

    /**
     * Virtual function.
     * Handles the animation loop.
     */
    animate() {
       throw new Error('You have to implement the method init!');
    }
}

export default Base
