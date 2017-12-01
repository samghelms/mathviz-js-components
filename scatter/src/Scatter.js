import React from 'react'
import {Visualization} from './2dscatter'
// import {Visualization} from './render_math_3d'
// import {Visualization} from './scatter_logic'

const scatterStyle = {width: 300, height: 300}

class Scatter extends React.Component {
  constructor(props) {
    super(props)
    this.v
  }

  componentDidMount() {
    const container = document.querySelector('#scatter_container');
    this.v = new Visualization(container)
    // container.appendChild(this.renderer.domElement);
    // var pcBuffer = generatePointcloud( new THREE.Color( 1,0,0 ), 150, 150 );
    // add_to_scene(this.scene, pcBuffer)

  }
  render () {
    return (
      <div tabindex="1">
        <div tabindex="2" id = "scatter_container" style ={scatterStyle}/>
      </div>
    );
  }
}

export default Scatter;
