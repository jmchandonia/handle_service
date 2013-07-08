/*

  Auxiliary Store javascript client library

  FUNCTIONS

  init

  set_auth

  get_node

  get_all_nodes

  delete_node

  create_node

  update_node

*/
(function () {
    
    var root = this;
    var SHOCK = root.SHOCK = {};

    SHOCK.url = null;
    SHOCK.auth_header = {};
    SHOCK.currentChunk = 0;
    
    SHOCK.init = function (params) {
	if (params.url !== null) {
	    SHOCK.url = params.url;
	}

	if (params.token !== null) {
	    SHOCK.set_auth(params.token);
	}
    }

    SHOCK.set_auth = function (token) {
	SHOCK.auth_header = {'Authorization': 'OAuth '+token}
    };

    SHOCK.get_all_nodes = function (ret) {
	var url = SHOCK.url+'/node';
	var promise = jQuery.Deferred();
        jQuery.getJSON(url, { 
	    success: function(data) {
		var retval = null;
		if (data != null && data.hasOwnProperty('data')) {
		    if (data.error != null) {
			retval = null;
			console.log("error: "+data.error);
		    } else {
			retval = data.data;
		    }
		} else {
		    retval = null;
		    console.log("error: invalid return structure from SHOCK server");
		    console.log(data);
		}
		
		if (typeof ret == "function") {
		    ret(retval);
		} else {
		    ret = retval;
		}
		
		promise.resolve();
	    },
	    error: function(jqXHR, error) {
		console.log( "error: unable to connect to SHOCK server" );
		console.log(error);
		promise.resolve();
	    },
	    headers: SHOCK.auth_header
	});

	return promise;
    };

    SHOCK.get_node = function (node, ret) {
	var url = SHOCK.url+'/node/'+node
	var promise = jQuery.Deferred();
        jQuery.getJSON(url, { 
	    success: function(data) {
		var retval = null;
		if (data != null && data.hasOwnProperty('data')) {
		    if (data.error != null) {
			retval = null;
			console.log("error: "+data.error);
		    } else {
			retval = data.data;
		    }
		} else {
		    retval = null;
		    console.log("error: invalid return structure from SHOCK server");
		    console.log(data);
		}
		
		if (typeof ret == "function") {
		    ret(retval);
		} else {
		    ret = retval;
		}
		
		promise.resolve();
	    },
	    error: function(jqXHR, error) {
		console.log( "error: unable to connect to SHOCK server" );
		console.log(error);
		promise.resolve();
	    },
	    headers: SHOCK.auth_header
	});

	return promise;
    };

    SHOCK.delete_node = function (id) {
	var promise = jQuery.Deferred();
	jQuery.ajax(url+"/" + id, {
	    success: function (data) {
		if (typeof ret == "function") {
		    ret(true);
		} else {
		    ret = true;
		}
		promise.resolve();
	    },
	    error: function(jqXHR, error){
		if (typeof ret == "function") {
		    ret(null);
		}
		console.log( "error: unable inquire SHOCK server" );
		console.log(error);
		promise.resolve();
	    },
	    headers: SHOCK.auth_header,
	    type: "DELETE"
	});
	
	return promise;
    };

    SHOCK.create_node = function (input, attr, ret) {
	return SHOCK.upload(input, null, attr, ret);
    };

    SHOCK.update_node = function (node, attr, ret) {
	return SHOCK.upload(null, node, attr, ret);
    };
    
    SHOCK.upload = function (input, node, attr, ret) {
	var url = SHOCK.url+'/node';
	var promise = jQuery.Deferred();

	// check if a file is uploaded
	if (input != null) {
	    if (typeof input == "string") {
		input = document.getElementById(input);
		if (input == null) {
		    console.log("error: file element not found in DOM");
		    return;
		}
	    }
	    if ((typeof input != "object") || (! input.files)) {
		console.log("error: input argument must be an input type file element or its id");
		return;
	    }
	    
	    var files = input.files;
	    if (files.length > 1) {
		console.log("error: you can only submit one file at a time");
		return;
	    }
	    if (files.length == 0) {
		console.log("error: no file selected");
		return;
	    }
	    
	    // upload the file
	    var chunkSize = 2097152;
	    var file = files[0];
	    var chunks = Math.ceil(file.size / chunkSize);
	    
	    // if this is a chunked upload, check if it needs to be resumed
	    var blobSlice = File.prototype.slice || File.prototype.mozSlice || File.prototype.webkitSlice;
	    jQuery.ajax(url+"?query&incomplete=1", {
		success: function (data) {
		    incompleteShocks(data);
		},
		error: function(jqXHR, error){
		    if (typeof ret == "function") {
			ret(null);
		    }
		    console.log( "error: unable inquire SHOCK server" );
		    console.log(error);
		    
		    promise.resolve();
		},
		headers: SHOCK.auth_header,
		type: "GET"
	    });
	    
	    var incompleteShocks = function (data) {
		var incomplete = null;
		for (i=0;i<data.data.length;i++) {
		    if ((file.size == data.data[i]["attributes"]["incomplete_size"]) && (file.name == data.data[i]["attributes"]["incomplete_name"])) {
			incomplete = data.data[i];
		    }
		}
		
		SHOCK.currentChunk = 0;
		var frOnload = function(e) {
		    var fd = new FormData();
		    var oMyBlob = new Blob([e.target.result], { "type" : file.type });
		    fd.append(SHOCK.currentChunk+1, oMyBlob);
		    jQuery.ajax(url, {
			contentType: false,
			processData: false,
			data: fd,
			success: function(data) {
			    SHOCK.currentChunk++;
			    if ((SHOCK.currentChunk * chunkSize) > file.size) {
				if (typeof ret == "function") {
				    ret(data.data);
				} else {
				    ret = data.data;
				}
				
				if (attr == null) {
				    promise.resolve();
				}
			    } else {
				loadNext();
			    }
			},
			error: function(jqXHR, error){
			    if (typeof ret == "function") {
				ret(null);
			    } else {
				ret = null;
			    }
			    console.log( "error: unable inquire SHOCK server" );
			    console.log(error);

			    promise.resolve();
			},
			headers: SHOCK.auth_header,
			type: "PUT"
		    });
		};
		
		var frOnerror = function () {
		    console.warn("error during upload at chunk "+SHOCK.currentChunk+".");

		    promise.resolve();
		};
		
		function loadNext() {
		    var fileReader = new FileReader();
		    fileReader.onload = frOnload;
		    fileReader.onerror = frOnerror;
		    
		    var start = SHOCK.currentChunk * chunkSize,
		    end = ((start + chunkSize) >= file.size) ? file.size : start + chunkSize;
		    
		    fileReader.readAsArrayBuffer(blobSlice.call(file, start, end));
		};
		
		var incomplete_attr = {};
		if (incomplete != null) {
		    url += "/" + incomplete.id;
		    SHOCK.currentChunk = incomplete.attributes.incomplete_chunks || 0;
		    loadNext();
		} else {
		    incomplete_attr = { "incomplete": "1", "incomplete_size": file.size, "incomplete_name": file.name };
		    var aFileParts = [ JSON.stringify(incomplete_attr) ];
		    var oMyBlob = new Blob(aFileParts, { "type" : "text\/json" });
		    var fd = new FormData();
		    fd.append('attributes', oMyBlob);
		    fd.append('parts', chunks);
		    jQuery.ajax(url, {
			contentType: false,
			processData: false,
			data: fd,
			success: function(data) {
			    url += "/" + data.data.id;
			    loadNext();
			},
			error: function(jqXHR, error){
			    if (typeof ret == "function") {
				ret(null);
			    } else {
				ret = null;
			    }
			    console.log( "error: unable inquire SHOCK server" );
			    console.log(error);

			    promise.resolve();
			},
			headers: SHOCK.auth_header,
			type: "POST"
		    });
		}
	    }
	}

	// update the attributes
	if ((attr != null) && (node != null)) {
	    var aFileParts = [ JSON.stringify(attr) ];
	    var oMyBlob = new Blob(aFileParts, { "type" : "text\/json" });
	    var fd = new FormData();
	    fd.append('attributes', oMyBlob);
	    jQuery.ajax(url +  "/" + node, {
		contentType: false,
		processData: false,
		data: fd,
		success: function(data){
		    if (typeof ret == "function") {
			ret(data.data);
		    } else {
			ret = data.data;
		    }
		    
		    promise.resolve();
		},
		error: function(jqXHR, error){
		    if (typeof ret == "function") {
			ret(null);
		    } else {
			ret = null;
		    }
		    console.log( "error: unable to submit to SHOCK server" );
		    console.log(error);

		    promise.resolve();
		},
		headers: SHOCK.auth_header,
		type: "PUT"
	    });
    	}

	return promise;
    }
    
}).call(this);