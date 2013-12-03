
///////////
// Setup //
///////////

testmap =
{
	'String':
	{
		"'foo'": 'foo',
		"String('foo')": String('foo'),
		"new String('foo')": new String('foo'),
		constructor: String
	},

	'Number':
	{
		"123": 123,
		"Number(123)": Number(123),
		"new Number(123)": new Number(123),
		"NaN": NaN,
		"Infinity": Infinity,
		constructor: Number
	},

	'RegExp':
	{
		"/./": /./,
		"new RegExp('\\\\.')": new RegExp("\\."),
		constructor: RegExp
	},

	'Function':
	{
		"function(){}": function() {},
		"Function()": Function(),
		"new Function(){}": new Function(),
		constructor: Function
	},

	'Array':
	{
		"[]": [],
		"Array()": Array(),
		"new Array()": new Array(),
		constructor: Array
	},

	'Object':
	{
		"{}": {},
		"Object()": Object(),
		"new Object()": new Object(),
		"undefined": undefined,
		"void 0": void 0,
		"null": null,
		constructor: Object
	}
};

//////////
// Util //
//////////

function forOwn(obj, iterator, context){
	for(var key in obj)
	{
		if(obj.hasOwnProperty(key))
		{
			iterator.call(context, obj[key], key, obj);
		}
	}
};

////////////////////////////
// generate pending tests //
// log messages			  //
////////////////////////////

describe('TypeChecks', function(){

	forOwn(testmap, function(typeObj, clazz){

		describe(clazz, function(){

			// typeof

			forOwn(typeObj, function(value, key){

				if(key === 'constructor') return;

				it('`typeof ' + key + '` >>> `' + (typeof value) + '`');
			});

			// instanceof

			forOwn(typeObj, function(value, key){

				if(key === 'constructor') return;

				forOwn(testmap, function(o, clazz2){

					it('`' + key + ' instanceof ' + clazz2 + '` >>> `' + (value instanceof o.constructor) + '`');
				});
			})
		})
	})
});