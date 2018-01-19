import React from 'react'
import LabeledScatter from './clean/LabeledScatter'
// import {Visualization} from './render_math_3d'
// import {Visualization} from './scatter_logic'
import tsne_embeddings from './data/tnse_embeddings_dev.json'
import {mathFormatter} from './helpers'

const scatterStyle = {width: 600, height: 600, position: "static"}

class Scatter extends React.Component {
  constructor(props) {
    super(props)
    this.v
  }

  componentDidMount() {
    const container = document.querySelector('#scatter_container')
    this.v = new LabeledScatter(container, tsne_embeddings, mathFormatter)
    this.v.run()
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
