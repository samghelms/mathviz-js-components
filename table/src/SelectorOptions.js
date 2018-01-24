import React from 'react';
import Select from 'react-select';

class SelectorOptions extends React.Component {

    constructor(props) {
        super(props)
        this.state = {
                      value: {
                        value: null,
                        label: null
                      }
                    }
        this.onChange = this.onChange.bind(this)
    }


    onChange(value) {

        if(!value) {
            this.setState({ value: {value: null, label: null} } );
            return
        }

        this.setState({ value: {value: value, label: value}});

    } 
    
    render () {
        
        return (
            <div style = {{width: "50%"}}>
                <div> Select option to filter by </div>
                <Select
                      onChange={this.onChange}
                      options={this.props.options}
                      simpleValue
                      value={this.state.value}
                  />
            </div>
        )
    }
}

export default SelectorOptions