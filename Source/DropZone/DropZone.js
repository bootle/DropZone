/*
---

name: DropZone

description: Crossbrowser file uploader with HTML5 chunk upload support, flexible UI and nice modability. 
Uploads are based on Mooupload by Juan Lago

changes:

- modal architecture
- all visible HTML is external for very flexible UI
- the class adapts to use elements of UI provided, even if not all
- image data collection for instant thumbnail output (HTML5 only)
- drag and drop uploads (HTML5 only)
- HTML4 uploads fixed
- additional vars are added and passed as a query string
- less options
- general cleanup

version: 0.1 (alpha!)

license: MIT-style license

authors:
  - Mateusz Cyrankiewicz
  - Juan Lago

requires: [Core/Class, Core/Object, Core/Element.Event, Core/Fx.Elements, Core/Fx.Tween]

provides: [DropZone]

...
*/

var DropZone = new Class({

	Implements: [Options, Events],

	options: {
		
		// UI Elements
		
		/* 
		The class accomodates to use what's available:
		- eg. if ui_list is defined, uploaded items will be output into it, otherwise this functionality will be disabled
		- ui_button OR ui_drop_area is required to select files
		- drop area only works in HTML5 mode
		- drop area and ui_list can be the same element
		- drop area and ui_button can be the same element
		*/
		
		ui_button: null,
		ui_list: null,
		ui_drop_area: null,
		
		// Settings
		
		url: 'upload.php',
		accept: '*/*',
		method: null, // for debugging, values: 'HTML5', 'HTML4', 'Flash' or null for automatic selection
		multiple: true,
		autostart: true,
		max_queue: 5,
		min_file_size: 1,
		max_file_size: 0,
		block_size: 101400, // Juan doesn't recommend less than 101400 and more than 502000
		vars: { // additional to be sent to backend
			'isDropZone': true // example..
		},
		flash: {
			movie: 'Moo.Uploader.swf'
		},
		
		// Events
		
		/*
		onInit: function (method) {},
		
		onSelectError: function (error, filename, filesize) {},
		
		onAddFiles: function () {},
		
		onUploadStart: function (){}, // start of queue
		onUploadComplete: function (num_uploaded){}, // end of queue
		onUploadProgress: function (perc) {}, // on progress of queue
		
		onItemAdded: function (element, file, imageData) {}, // listener should add HTML for the item (get params like file.name, file.size), imageData is sent only for images
		onItemCancel: function (element, file) {},
		onItemComplete: function (item, file, response) {},
		onItemError: function (item, response, id) {},
		onItemProgress: function (item, perc) {}
		*/
	
	},
	
	// Vars
	
	method: null,
	fileList: new Array(),
	lastInput: undefined, // stores new, currently unused hidden input field
	nCurrentUploads: 0,
	nUploaded: 0,
	queuePercent: 0,
	isUploading: true,
	flashObj: null,
	flashloaded: false,
	uiButton: null,
	uiList: null,
	uiDropArea: null,
	hiddenContainer: null,
		

	
	// Init

	initialize: function (options) {

		/*
		* Check what's available
		* and initiate based on that
		* note: swap bits here to make Flash preferred to HTML5
		*/
		
		this.method = options.method; // ONLY FOR DEBUGGING!
		
		// Check HTML5 support & if module is available
		
		if (!this.method && window.File && window.FileList && window.FileReader && window.Blob && typeof DropZone['HTML5'] != 'undefined') {
			
			this.method = 'HTML5';

			// Unfortunally Opera 11.11 has an incomplete Blob support
			if (Browser.opera && Browser.version <= 11.11) this.method = null;
			
		}

		// Check flash support & if module is available
		if (!this.method && typeof DropZone['Flash'] != 'undefined') this.method = Browser.Plugins.Flash && Browser.Plugins.Flash.version >= 9 ? 'Flash' : null;
		
		// If not Flash or HTML5, go for HTML4 if module is available
		if (!this.method && typeof DropZone['HTML4'] != 'undefined') this.method = 'HTML4';
				
		// Activate proper method (self-extend)
		
		if(typeof DropZone[this.method] != 'undefined') {
			
			return new DropZone[this.method](options);
			
		} else {
		
			console.log('DropZone method is not available, please include the file: DropZone.' + this.method);
			
		}
		
	},
	
	activate: function(){
		
		// Add vars to URL (query string)
		
		this.url = this.options.url + ((!this.options.url.match('\\?')) ? '?' : '&') + Object.toQueryString(this.options.vars)
		
		// set UI elements
		
		this.uiButton = $(this.options.ui_button);
		this.uiList = $(this.options.ui_list);
		this.uiDropArea = $(this.options.ui_drop_area);
		
		// just any of elements, to keep injected invisible elements next to
		var omphallus = this.uiButton || this.uiList || this.uiDropArea;
		if(!omphallus) return;
		
		// container for invisible things
		this.hiddenContainer = new Element('div', {'class': 'dropzone_hidden_wrap'}).inject(omphallus, 'after');
		
		this._newInput();
		
		this.fireEvent('init', [this.method]);
		
	},
	
	
	
	
	/* Public methods */
	
	// adds files before upload
	
	addFiles: function (files) {
		
		for (var i = 0, f; f = files[i]; i++) {

			var fname = f.name || f.fileName;
			var fsize = f.size || f.fileSize;

			if (fsize != undefined) {

				if (fsize < this.options.min_file_size) {
					this.fireEvent('onSelectError', ['minfilesize', fname, fsize]);
					return false;
				}

				if (this.options.max_file_size > 0 && fsize > this.options.max_file_size) {
					this.fireEvent('onSelectError', ['maxfilesize', fname, fsize]);
					return false;
				}

			}
			
			var id = this.fileList.length;
			
			this.fileList[id] = {
				file: f,
				id: id,
				uniqueid: String.uniqueID(),
				checked: true,
				name: fname,
				type: f.type || f.extension || this._getFileExtension(fname) ,
				size: fsize,
				uploaded: false,
				uploading: false,
				progress: 0,
				error: false
			};
			
			if (this.uiList) this._addNewItem(this.fileList[this.fileList.length - 1]);

		}

		// fire!
		this.fireEvent('onAddFiles');

		this._newInput();

		if (this.options.autostart) this.upload();

	},
	
	// starts upload
	
	upload: function () {
		
		this.isUploading = false;

		this.fireEvent('onUploadStart');

	},
	
	// cancels a specified item
	
	cancel: function(id, item) {
		
		if(!this.fileList[id]) return;
		
		this.fileList[id].checked = false;
		
		this.nCurrentUploads--;
		
		if(this.nCurrentUploads == 0) this._queueComplete();
		
		this.fireEvent('onItemCancel', [item]);

	},
	

	
	
	
	
	
	
	
	/* Private methods */
		
	// Activate button used by HTML4 & HTML5 uploads
	
	_activateHTMLButton: function (){
	
		if(!this.uiButton) return;
		
		this.uiButton.addEvent('click', function (e) {
			e.stop();

			// Click trigger for input[type=file] only works in FF 4.x, IE and Chrome
			this.lastInput.click();

		}.bind(this));
		
	},
	
	// creates hidden input elements to handle file uploads nicely
	
	_newInput: function (formcontainer) {
		
		// Hide old input
		// --> THIS CAN BE SIMPLER !
		
		/*var inputsnum = this._countInputs();
		if (inputsnum > 0) {
			this.hiddenContainer.getElement('#tbxFile_' + (inputsnum - 1)).setStyles({
				top: 0,
				left: 0,
				styles: {
					display: 'none'
				}
			});
		}*/
		
		if(!formcontainer) formcontainer = this.hiddenContainer;
		
		// Input File
		this.lastInput = new Element('input', {
			id: 'tbxFile_' + this._countInputs(),
			name: 'tbxFile_' + this._countInputs(),
			type: 'file',
			size: 1,
			styles: {
				position: 'absolute',
				top: 0,
				left: 0/*,
				border: 0*/
			},
			multiple: this.options.multiple,
			accept: this.options.accept

		}).inject(formcontainer);


		// Old version of firefox and opera don't support click trigger for input files fields
		// Internet "Exploiter" do not allow trigger a form submit if the input file field was not clicked directly by the user
		if (this.method != 'Flash' && (Browser.firefox2 || Browser.firefox3 || Browser.opera || Browser.ie)) {
			this._positionInput();
		} else {
			this.lastInput.setStyle('visibility', 'hidden');
		}
		
	},

	_positionInput: function () {
		
		if(!this.uiButton && true) return;
		
		// Get addFile attributes
		var btn = this.uiButton,
			btncoords = btn.getCoordinates(btn.getOffsetParent());

		/*
		this.lastInput.position({
		  relativeTo: document.id(subcontainer_id+'_btnAddfile'),
		  position: 'bottomLeft'
		});
		*/

		this.lastInput.setStyles({
			top: btncoords.top,
			left: btncoords.left - 1,
			width: btncoords.width + 2,
			// Extra space for cover button border
			height: btncoords.height,
			opacity: 0.0001,
			// Opera opacity ninja trick
			'-moz-opacity': 0
		});

	},

	_updateQueueProgress: function () {
		
		var perc = 0,
			n_checked = 0;
		
		this.fileList.each(function(f){
			if (f.checked) {
				perc += f.progress;
				n_checked++;
			}
		});
		
		if(n_checked == 0) return;
		
		this.queuePercent = perc / n_checked;
		
		this.fireEvent('onUploadProgress', [this.queuePercent]);
		
	},
	
	_queueComplete: function(){
		
		this.fireEvent('uploadComplete', [this.nUploaded]);
		
	},

	_itemComplete: function(item, file, response){
		
		this.nCurrentUploads--;
		this.nUploaded++;
		
		this.fileList[file.id].uploaded = true;

		this.fireEvent('onItemComplete', [item, file, response]);
		
		console.log('N CURRENT: ' + this.nCurrentUploads);
		console.log('N UPLOADED: ' + this.nUploaded);
		
		if(this.nCurrentUploads == 0) this._queueComplete();
		
	},

	_itemError: function(item, file, response){
		
		this.nCurrentUploads--;
		
		this.fileList[file.id].uploaded = true;

		this.fireEvent('onItemError', [item, file, response]);
		
	},	
	
	_addNewItem: function (file) {
		
		// create a basic wrapper for the thumb
		
		var item = new Element('div', {
			'class': 'dropzone_item',
			'id': 'dropzone_item_' + file.id
		}).inject(this.uiList);
		
		// check file type, and get thumb if it's an image
		
		if (typeof FileReader !== 'undefined' && file.type.match('image')) {
				
			reader = new FileReader();
			reader.onload = function (e) {
				this.fireEvent('itemAdded', [item, file, e.target.result]);
			}.bind(this);
			
			/*reader.onload = (function (theImg) {
				
				/*return function (evt) {
					theImg.src = evt.target.result;
				};*
			}(img));*/
			
			reader.readAsDataURL(file.file);
			
		} else {
			
			this.fireEvent('itemAdded', [item, file]);
			
		}
		
	},

	_getInputs: function () {
		return this.hiddenContainer.getElements('input[type=file]');
	},

	_getForms: function () {
		return this.hiddenContainer.getElements('form');
	},

	_countInputs: function () {
		var containers = this._getInputs();
		return containers.length;
	},
	
	_getFileExtension: function(filename){
		return filename.split('.').pop();
	},
	
	// Change handling response to what you use in backend here..
	
	_checkResponse: function(response){
		return (response.error == 0);
	}


});