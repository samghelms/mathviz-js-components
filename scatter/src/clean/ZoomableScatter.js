import BaseScatter from './BaseScatter'
const THREE = require(`three.min.js`) 
// TODO: only use the required d3 zoom package
const d3 = require(`d3.v4.min.js`)

class ZoomableScatter extends BaseScatter {
	constructor(domEl, data, invariant) {
		super(domEl, data)

    this.mouse = new THREE.Vector2();
    this.onDocumentMouseMove = this.onDocumentMouseMove.bind(this)

    this.setupZoom = this.setupZoom.bind(this)
    this.getCurrentScale = this.getCurrentScale.bind(this)
    this.getPointScale = this.getPointScale.bind(this)

    // controls whether points shrink on zoom
    this.invariant = invariant

    this.initZoomableScatter = this.initZoomableScatter.bind(this)

    this.scatterZoom = this.scatterZoom.bind(this)
  }

  init() {
    this.initBaseScatter()
    this.initZoomableScatter()
  }

  initZoomableScatter() {
    document.addEventListener( 'mousemove', this.onDocumentMouseMove, false );
    // setup zoom
    const view = d3.select(this.container);
    const zoom = this.setupZoom()
    view.call(zoom);
    zoom.scaleTo(view, this.far-1);
  }

  onDocumentMouseMove( event ) {
    event.preventDefault();
    this.mouse.x = ( event.clientX / this.width ) * 2 - 1;
    this.mouse.y = - ( event.clientY / this.height ) * 2 + 1;
  }

  setupZoom() {
    const outerThis = this
    const zoom = d3.zoom()
    .scaleExtent([outerThis.near, outerThis.far-1])
    .wheelDelta(function wheelDelta() {
      // this inverts d3 zoom direction, which makes it the rith zoom direction for setting the camera
      return d3.event.deltaY * (d3.event.deltaMode ? 120 : 1) / 500;
    })
    .on('zoom', this.scatterZoom);

    return zoom
  }

  scatterZoom() {
    const event = d3.event;
    if (event.sourceEvent) {
      // Get z from D3
      const new_z = event.transform.k;
      if (new_z !== this.camera.position.z && new_z < this.far) {
        // Handle a zoom event
        const { clientX, clientY } = event.sourceEvent;
        // Project a vector from current mouse position and zoom level
        // Find the x and y coordinates for where that vector intersects the new
        // zoom level.
        // Code from WestLangley https://stackoverflow.com/questions/13055214/mouse-canvas-x-y-to-three-js-world-x-y-z/13091694#13091694
        const vector = new THREE.Vector3(
          clientX / this.width * 2 - 1,
          - (clientY / this.height) * 2 + 1,
          1 
        );
        vector.unproject(this.camera);
        const dir = vector.sub(this.camera.position).normalize();
        const distance = (new_z - this.camera.position.z)/dir.z;
        const pos = this.camera.position.clone().add(dir.multiplyScalar(distance));

        if(!this.invariant) {
          let scale = this.getPointScale()
          this.pointsMaterial.setValues({size: this.pointSize*scale});
        }            
        // Set the camera to new coordinates
        this.camera.position.set(pos.x, pos.y, new_z);
      } else {
        // Handle panning
        const { movementX, movementY } = event.sourceEvent;
        // Adjust mouse movement by current scale and set camera
        const current_scale = this.getCurrentScale();
        this.camera.position.set(this.camera.position.x - movementX/current_scale, this.camera.position.y +
          movementY/current_scale, this.camera.position.z);
      }
    }
  }

  getCurrentScale() {
    var vFOV = this.camera.fov * Math.PI / 180
    var scale_height = 2 * Math.tan( vFOV / 2 ) * this.camera.position.z
    var currentScale = this.height / scale_height
    return currentScale
  }

  getPointScale() {
    return (this.camera.position.z)/this.far*(1+2*(this.far-(this.camera.position.z))/this.far);
  }
}

export default ZoomableScatter
