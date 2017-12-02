import './CSS3DRenderer'
import './threeoctree.min.js'
import {formatMath} from './helpers'
import {generateIndexedPointcloud} from './generate_point_clouds'
import formula_list from './data/formula_list.json'
import sprite from './data/sprites/disc.png';

const Stats = require(`stats.min.js`) 
const THREE = require(`three.min.js`) 
const d3 = require(`d3.v4.min.js`)

// Point generator function
function phyllotaxis(radius, width, height) {
  const theta = Math.PI * (3 - Math.sqrt(5));
  var i = 0
  var pts = []
  while (i < 10000) {
    const r = radius * Math.sqrt(i), a = theta * i;
    pts.push(
    {coords: [
      width / 2 + r * Math.cos(a) - width / 2,
      height / 2 + r * Math.sin(a) - height / 2
      ]
    })
    i+=1
  };
  return pts
}

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

var table = [
  "\\int_5^5 x",
  "x = 5 + 7", 
  "100 * \\frac{5}{6}", 
  "\\gamma + \\phi = 5 ", 
  "\\gamma + \\phi = 5 ", 

];


export class Visualization {
  constructor(domEl) {

    this.table = formula_list
    this.mathct = 0
    this.oldMath, this.old_index
    this.raw_points
    this.particles
    this.PARTICLE_SIZE = 200
    this.octree = new THREE.Octree(
                                  {
                                    objectsThreshold: 1,
                                  }
                                  )
    this.sprite = new THREE.TextureLoader().load( sprite );
    this.active_indices = []
    this.mathObjs = {}

    this.container = domEl
    this.camera, this.scene, this.renderer, this.zoom
    this.scene_css, this.renderer_css
    this.raycaster
    this.mouse = new THREE.Vector2();
    this.intersection = null
    
    this.width = window.innerWidth
    this.height = window.innerHeight

    this.stats

    this.near_plane = 2
    this.far_plane = 100
    this.maths = []

    this.points, this.pointsMaterial

    this.init = this.init.bind(this)
    this.animate = this.animate.bind(this)
    this.fetchData = this.fetchData.bind(this)
    this.setupZoom = this.setupZoom.bind(this)
    this.render = this.render.bind(this)
    this.onDocumentMouseMove = this.onDocumentMouseMove.bind(this)
    this.add_math = this.add_math.bind(this)
    this.drawBufferData = this.drawBufferData.bind(this)
    this.removeInactiveMath = this.removeInactiveMath.bind(this)

    this.init()
    this.animate()
    }

    init() {
      // Add canvas
      this.renderer = new THREE.WebGLRenderer();
      this.renderer.setSize(this.width, this.height);

      this.renderer_css = new THREE.CSS3DRenderer();
      this.renderer_css.setSize(this.width, this.height);
      this.renderer_css.domElement.style.position = 'absolute';

      //append
      this.container.appendChild( this.renderer_css.domElement );
      this.container.appendChild(this.renderer.domElement);

      // Add raycaster
      this.raycaster = new THREE.Raycaster();

      // Add stats box
      this.stats = new Stats();
      this.stats.dom.style.position = 'absolute';
      this.stats.dom.style.top = '0px';
      this.stats.dom.style.right = '0px'
      this.container.appendChild(this.stats.dom);

      // Set up camera and scene
      this.camera = new THREE.PerspectiveCamera(
        100,
        this.width / this.height,
        this.near_plane,
        this.far_plane 
      );

      this.camera.position.set(0, 0, this.far_plane);
      this.camera.lookAt(new THREE.Vector3(0,0,0));

      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color( 0xf0f0f0 );

      this.scene_css = new THREE.Scene();

      this.fetchData()
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
      // let raw_points = await fetch('//fastforwardlabs.github.io/visualization_assets/word2vec_tsne_2d.json')
      // .then(response => response.json())
      this.raw_points = phyllotaxis(0.5, this.width, this.height)
      // let obj = generateIndexedPointcloud( new THREE.Color( 0,1,0 ), 100, 100, 6 );
      // points.scale.set( 10,10,10 );
      // points.position.set( 5,0,5 );
      // this.points = obj.pointcloud
      // console.log(this.points)
      // this.pointsMaterial = obj.material
      this.scene.add(this.points)
      // this.drawData(this.raw_points)
      this.drawBufferData()
      this.scene.add(this.points);
 
    }

    add_math(math_id_dev, real_id, x, y) {
      // Don't need to re render things we already have
      if (this.active_indices.includes(real_id) ) {
        console.log("already have this")
        return
      }
      var element = document.createElement( 'div' );
      //
      formatMath(this.table[math_id_dev], element)
      element.className = 'element';
      var object = new THREE.CSS3DObject( element );
      object.position.x = x
      object.position.y = y
      object.position.z = 0 ;
      object.scale.set( 0.005, 0.005, 0.005 );  
      this.scene_css.add( object );
      this.mathObjs[real_id] = object
      
    }

    removeInactiveMath(oldMath, newMath) {
      let removeMath = oldMath.filter(x => !newMath.includes(x))
      for (let i of removeMath) {
        this.scene_css.remove(this.mathObjs[i])
        this.mathObjs[i] = null
      }
    }

    drawBufferData() {
        const n = 1000
        this.raw_points = raw_points_buffer(0.5, this.width, this.height, n)

        var positions = new Float32Array( this.raw_points.length );
        var colors = new Float32Array( this.raw_points.length );
        var index = new Uint16Array( n );
        var vertex;
        var color = new THREE.Color();

        this.test_index = []
        var k = 0
        for ( var i = 0; i < this.raw_points.length; i+=3 ) {
          colors[ i ] = 0
          colors[ i + 1 ] = 0
          colors[ i + 2 ] = 0
          this.test_index.push([this.raw_points[i], this.raw_points[i+1], this.raw_points[i+2]])
          this.octree.add( {x: this.raw_points[i], y: this.raw_points[i+1], z: this.raw_points[i+2], radius: 0.1, id: k })
          k++
        }

        for ( var i = 0; i < n; i++) {
          index[i] = i
        }

        var geometry = new THREE.BufferGeometry();
        geometry.addAttribute( 'position', new THREE.BufferAttribute( this.raw_points, 3 ) );
        geometry.addAttribute( 'color', new THREE.BufferAttribute( colors, 3 ) );
        geometry.setIndex( new THREE.BufferAttribute( index, 1 ) );
        //
        this.pointsMaterial = new THREE.PointsMaterial( { size: 0.5, map: this.sprite, alphaTest: 0.5, transparent: true } );
        this.pointsMaterial.color.setHSL( 1.0, 0.3, 0.1 );
        
        this.particles = new THREE.Points( geometry, this.pointsMaterial );

        this.scene.add( this.particles );
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
            
            let scale
            
            // if (outer_this.camera.position.z < 20) {
            //   scale = (20 -  outer_this.camera.position.z)/outer_this.camera.position.z;
            //   outer_this.pointsMaterial.setValues({size: 6 + 3 * scale});
            // } else if (outer_this.camera.position.z >= 20 && outer_this.pointsMaterial.size !== 6) {
            //   outer_this.pointsMaterial.setValues({size: 6});
            // }
                            
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
      this.raycaster.setFromCamera( this.mouse, this.camera );
      var intersections = this.raycaster.intersectObject( this.particles );
      // console.log(this.particles)
      // var new_closest = intersections[0] ? intersections[0].object.geometry.uuid : null
      if (intersections.length > 1) {
        // this.closest = new_closest.object.geometry.uuid
        // console.log(intersections[0].object.id)
        // console.log(this.closest)
        // console.log(intersections[0])

        var closest_id = this.test_index[intersections[0].index]
        // var newMath = this.maths[0]
        // newMath.position.copy( {x: id[0], y: id[1], z: id[2]} );
        const nneighbors = this.octree.search( {x: closest_id[0], y: closest_id[1], z: closest_id[2]}, 2 ) 
        
        let new_active_indices = []
        for(var i = 0; i < nneighbors.length && i < this.table.length; i++) {
          var id = this.test_index[nneighbors[i].object.id]

          this.add_math(i, nneighbors[i].object.id, id[0], id[1])

          new_active_indices.push(nneighbors[i].object.id)
                  
        } 
        this.removeInactiveMath(this.active_indices, new_active_indices)
        this.active_indices = new_active_indices

      }
      this.renderer.render(this.scene, this.camera);
      this.renderer_css.render( this.scene_css, this.camera );
    }

    animate() {
      requestAnimationFrame(this.animate);
      this.render()
      this.stats.update();
      this.octree.update()
    }
}