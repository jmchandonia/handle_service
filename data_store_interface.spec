/* The DataStoreInterface module provides a programmatic
   access to a remote file store.
*/
module DataStoreInterface {

	/* Handle provides a unique reference that enables
	   access to the data files through functions
	   provided as part of the DSI. In the case of using
	   shock, the id is the node id. In the case of using
	   shock the value of type is “shock”. In the future 
	   these values should enumerated. The value of url is
	   the http address of the shock server, including the
	   protocol (http or https) and if necessary the port.
	*/
	typedef structure {
		string file_name;
		string id;
		string type;
		string url;
	} Handle;

	
	/* new_handle returns a Handle object with a url and a node id */
	funcdef new_handle() returns (Handle h);

	/* The localize function attempts to locate a shock server near the service.
	   The localize function must be called before the Handle is initialized
	   becuase when the handle is initialized, it is given a node id that maps
	   to the shock server where the node was created.
	 */
	funcdef localize(string service_name, Handle h1) returns (Handle h2);

	/* initialize_handle returns a Handle object with an ID. */
	funcdef initialize_handle(Handle h1) returns (Handle h2);

};
