
const THREE = require(`three.min.js`) 

export function generatePointCloudGeometry( color, width, height ){
	const theta = Math.PI * (3 - Math.sqrt(5));
	const radius = 0.5
	var geometry = new THREE.BufferGeometry();
	var numPoints = width*height;
	var positions = new Float32Array( numPoints*3 );
	var colors = new Float32Array( numPoints*3 );
	var k = 0;
	for( var i = 0; i < width; i++ ) {
		const r = radius * Math.sqrt(i), a = theta * i;
		for( var j = 0; j < height; j++ ) {
			var x = width / 2 + r * Math.cos(a) - width / 2
			var y = height / 2 + r * Math.sin(a) - height / 2
			var z = 0;
			positions[ 3 * k ] = x;
			positions[ 3 * k + 1 ] = y;
			positions[ 3 * k + 2 ] = z;
			var intensity = ( y + 0.1 ) * 5;
			colors[ 3 * k ] = color.r 
			colors[ 3 * k + 1 ] = color.g 
			colors[ 3 * k + 2 ] = color.b 
			k++;
		}
	}
	geometry.addAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );
	geometry.addAttribute( 'color', new THREE.BufferAttribute( colors, 3 ) );
	geometry.computeBoundingBox();
	return geometry;
}

export function generatePointcloud( color, width, length, pointSize ) {
	var geometry = generatePointCloudGeometry( color, width, length );
	var material = new THREE.PointsMaterial( { size: pointSize, vertexColors: THREE.VertexColors } );
	var pointcloud = new THREE.Points( geometry, material );
	return pointcloud;
}
export function generateIndexedPointcloud( color, width, length, pointSize  ) {
	var geometry = generatePointCloudGeometry( color, width, length );
	var numPoints = width * length;
	var indices = new Uint16Array( numPoints );
	var k = 0;
	for( var i = 0; i < width; i++ ) {
		for( var j = 0; j < length; j++ ) {
			indices[ k ] = k;
			k++;
		}
	}
	geometry.setIndex( new THREE.BufferAttribute( indices, 1 ) );
	var material = new THREE.PointsMaterial( { size: pointSize, vertexColors: THREE.VertexColors } );
	var pointcloud = new THREE.Points( geometry, material );
	return {pointcloud: pointcloud, material: material};
}
export function generateIndexedWithOffsetPointcloud( color, width, length, pointSize  ){
	var geometry = generatePointCloudGeometry( color, width, length );
	var numPoints = width * length;
	var indices = new Uint16Array( numPoints );
	var k = 0;
	for( var i = 0; i < width; i++ ){
		for( var j = 0; j < length; j++ ) {
			indices[ k ] = k;
			k++;
		}
	}
	geometry.setIndex( new THREE.BufferAttribute( indices, 1 ) );
	geometry.addGroup( 0, indices.length );
	var material = new THREE.PointsMaterial( { size: pointSize, vertexColors: THREE.VertexColors } );
	var pointcloud = new THREE.Points( geometry, material );
	return pointcloud;
}
export function generateRegularPointcloud( color, width, length, pointSize  ) {
	var geometry = new THREE.Geometry();
	var colors = [];
	var k = 0;
	for( var i = 0; i < width; i++ ) {
		for( var j = 0; j < length; j++ ) {
			var u = i / width;
			var v = j / length;
			var x = u - 0.5;
			var y = ( Math.cos( u * Math.PI * 8 ) + Math.sin( v * Math.PI * 8) ) / 20;
			var z = v - 0.5;
			var v = new THREE.Vector3( x,y,z );
			geometry.vertices.push( v );
			var intensity = ( y + 0.1 ) * 7;
			colors[ k ] = ( color.clone().multiplyScalar( intensity ) );
			k++;
		}
	}
	geometry.colors = colors;
	geometry.computeBoundingBox();
	var material = new THREE.PointsMaterial( { size: pointSize, vertexColors: THREE.VertexColors } );
	var pointcloud = new THREE.Points( geometry, material );
	return pointcloud;
}


// // Point generator function
// export function 2dPointCloud(radius, width, height) {
//   const theta = Math.PI * (3 - Math.sqrt(5));
//   var i = 0
//   var pts = []
//   while (i < 10000) {
//     const r = radius * Math.sqrt(i), a = theta * i;
//     pts.push(
//     {coords: [
//       width / 2 + r * Math.cos(a) - width / 2,
//       height / 2 + r * Math.sin(a) - height / 2
//       ]
//     })
//     i+=1
//   };
//   return pts
// }