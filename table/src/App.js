import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';
import TableWrap from './Table'
import Selector from './Selector'
import SelectorOptions from './SelectorOptions'
import {formatMath, get_path} from './helpers'
import Trie from './Trie'

class App extends Component {

  constructor(props) {
    super(props)
    this.state = {suggestions: [], isFetchingSettings: true}
    this.getNeighbors=this.getNeighbors.bind(this)
    this.query=this.query.bind(this)
    this.getSettings=this.getSettings.bind(this)
    this.getSuggestions=this.getSuggestions.bind(this)
    this.formatTableObj=this.formatTableObj.bind(this)
    this.searchEngine = null
    this.searchIndex = null
    this.docs = null
  }

  async getSettings() {
    // fetch from local host
    console.log("=========settings===========")

    const settings = await fetch(window.SERVER_ADDRESS+`/settings`, {method: "GET"})
                          .then(response => response.json())
                          .then(json => json)
    console.log(settings)
    //todo: refactor this to not blow up the memory

    this.trie = new Trie(settings.docs)
    console.log("=========trie===========")

    this.setState({columns: settings.columns, isFetchingSettings: false})

  }

  // loadScripts() {
  //     var scriptElement=document.createElement('script');
  //     scriptElement.type = 'text/javascript';
  //     scriptElement.src = `${process.env.PUBLIC_URL+'/katex.js'}`;
  //     document.head.appendChild(scriptElement);
  // }

  componentDidMount() {
    // this.loadScripts()
    this.getSettings()

  }

  componentDidUpdate() {
    console.log("updated")
  }

  formatTableObj(el) {
    var ret_obj = {}
    const keys = Object.keys(el)
    for (var i = 0; i < keys.length; i++) {
      let col = keys[i]
      if(el[col].fmt) {
        if (el[col].fmt == "math") {
          ret_obj[col] = formatMath(el[col].data)
        }
      } else {
        ret_obj[col] = el[col].data
      }
    }
    return ret_obj
  }

  async getNeighbors(query) {

    // fetch from local host
    const json = await fetch(window.SERVER_ADDRESS+`/query`,
                              {method: 'POST', body: JSON.stringify({"query": query} )} )
                              .then(response => response.json() )
                              .then(json => json)
    console.log(json)
    const processed = json.neighbors.map(el => this.formatTableObj(el)
                                        )
    this.setState({neighbors: processed})
  }

  query(query) {
    console.log("querying")
    this.getNeighbors ( query )
  }

  async getSuggestions(input) {
    if(input.length < 3 || this.state.isFetchingSettings) {
      return
    }
   const cands = this.trie.autocomplete(input, 20)
   const suggests = cands.slice(0,20).map(el=> ({value: el, label: formatMath(el)}))
   this.setState({suggestions: suggests})

  }

  render() {
    console.log(this.state)
    return (
      <div className="App">
        <Selector getSuggestions={this.getSuggestions} query={this.query} options={this.state.suggestions} />
        <TableWrap columns={this.state.columns ? this.state.columns: []} data={this.state.neighbors}/>
      </div>
    );
  }
}

 // <TableWrap columns={this.state.columns ? this.state.columns: []} data={this.state.neighbors}/>
//         <Selector getSuggestions={this.getSuggestions} query={this.query} options={["dafs"]} />


// <TableWrap columns={this.state.columns ? this.state.columns: []} data={this.state.neighbors}/>

export default App;
