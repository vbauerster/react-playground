import React from 'react';

class App extends React.Component {

     /**
      * babel claims property initializers can be defined using ES7, like:
      *
      *   static defaultProps = {
      *       name: 'World'
      *   }
      *
      * but, in fact it doesn't work at the moment
      * see: http://babeljs.io/blog/2015/06/07/react-on-es6-plus/
      * ps: You need to enable stage 0 babel transforms to use this
      */

    render() {
        var name = this.props.name;
        return (
            <p>Hello {name}</p>
        );
    }
}

App.propTypes = {
    name: React.PropTypes.string
};

App.defaultProps = {
    name: 'World'
};

React.render(<App />, document.getElementById('app'));
