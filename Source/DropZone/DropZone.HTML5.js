/*
---

name: DropZone.HTML5

description: A DropZone module. Handles uploading using the HTML5 method

license: MIT-style license

authors:
  - Mateusz Cyrankiewicz
  - Juan Lago

requires: [DropZone]

provides: [DropZone.HTML5]

...
*/

DropZone.HTML5 = new Class({

	Extends: DropZone,

	initialize: function (options) {
		
		this.setOptions(options);
		
		this.method = 'HTML5'
		
		this.activate();
		
	},
	
	activate: function (){
		
		this.parent();
		
		// If drop area is specified, 
		// and in HTML5 mode,
		// activate dropping
		
		if(this.uiDropArea){
			
			// Extend new events
			Object.append(Element.NativeEvents, {
				dragenter: 2,
				dragleave: 2,
				dragover: 2,
				drop: 2
			});
			
			this.uiDropArea.addEvents({
							
				'dragenter': function (e) {
					
					e.stop();
					this.uiDropArea.addClass('dropzone_over');
					
				}.bind(this),
				
				'dragleave': function (e) {
					
					e.stop();
					
					console.log(e.target);
					
					if (e.target && e.target === this.uiDropArea) {
						this.uiDropArea.removeClass('dropzone_over');
					}
					
				}.bind(this),
				
				'dragover': function (e) {
				
					e.stop();
					e.preventDefault();
					
				}.bind(this),
				
				'drop': function (e) {
				
					e.stop();
					
					if(e.event.dataTransfer) {
						
						this.addFiles(e.event.dataTransfer.files);
						
					}
					
					this.uiDropArea.removeClass('dropzone_over');
					
				}.bind(this)
				
			});
			
			// prevent defaults on window
			
			// --> ADD REMOVING THESE ON KILL
			
			/*$(document.body).addEvents({
							
				'dragenter': function (e) {
					
					e.stop();
					
				}.bind(this),
				
				'dragleave': function (e) {
					
					e.stop();
					
				}.bind(this),
				
				'dragover': function (e) {
				
					e.stop();
					
				}.bind(this),
				
				'drop': function (e) {
				
					e.stop();
					
				}.bind(this)
				
			});*/
		}
		
		
		// Activate trigger for html file input
		
		this._activateHTMLButton();
		
	},
	
	upload: function () {
		
		this.parent();
		
		this.fileList.each(function(file, i){
	
			if (this.nCurrentUploads <= this.options.max_queue) {
				
				// Upload only checked and new files
				if (file.checked && !file.uploading) {
					this.isUploading = true;
					file.uploading = true;
					this.nCurrentUploads++;
					
					this._html5Send(file, 0, false);
					
				}

			}

		}, this);
		
	},

	_html5Send: function (file, start, resume) {

		var end = this.options.block_size,
			chunk;

		var total = start + end;
		if (total > file.size) end = total - file.size;


		// Get slice method
		
		if (file.file.mozSlice) // Mozilla based
			chunk = file.file.mozSlice(start, total);
		else if (file.file.webkitSlice) // Chrome, Safari, Konqueror and webkit based
			chunk = file.file.webkitSlice(start, total);
		else if (file.file.slice) // Opera and other standards browsers
			chunk = file.file.slice(start, total);
		else 
			chunk = file.file;
		
		// Set headers
		
		var headers = {
			'Cache-Control': 'no-cache'
		}
		
		// Add call-specific vars
		
		var url = this.url + '&' + Object.toQueryString({
			'X-Requested-With': 'XMLHttpRequest',
			'X-File-Name': file.name,
			'X-File-Size': file.size,
			'X-File-Id': file.id,
			'X-File-Resume': resume
		});
		
		// Send request
		
		var xhr = new Request.Blob({
			url: url,
			headers: headers,
			onSuccess: function (response) {
				
				try {
					response = JSON.decode(response, true);
				} catch(e){
					response = '';
				}
				
				var item;
				if (this.uiList) item = this.uiList.getElement('#dropzone_item_' + (file.id));
				
				if (this._checkResponse(response)) {
					
					//if(response.finish == true) alert('FINISH returned correctly!');
					
					//if (!response.finish) {
					if (total < file.size) {
						
						// in progress..
						
						if(file.checked) {
							
							var perc = (total / file.size) * 100;
							
							// used to calculate global progress
							this.fileList[file.id].progress = perc;
							
							this.fireEvent('itemProgress', [item, perc]);
							
							this._updateQueueProgress();
							
							this._html5Send(file, start + response.size.toInt(), file.id, true) // Recursive upload
						}
						
					} else {
						
						// job done!
						
						this._itemComplete(item, file, response);

						if (this.nCurrentUploads != 0 && this.nCurrentUploads <= this.options.max_queue && file.checked) this.upload();

					}
					
				} else {
					
					// errror!
					
					this._itemError(item, file, response);
					
					if(this.nCurrentUploads == 0)
						this._queueComplete();
					else if (this.nCurrentUploads != 0 && this.nCurrentUploads <= this.options.max_queue) 
						this.upload();

				}

			}.bind(this)
			
		});

		xhr.send(chunk);

	},

	cancel: function (id, item) {
		
		this.parent(id, item);
		
		//
		
	},
	
	
	/* Private methods */
	
	_newInput: function () {
		
		this.parent();
		
		// add interaction to input
		
		this.lastInput.addEvent('change', function (e) {
			
			e.stop();

			this.addFiles(this.lastInput.files);

		}.bind(this));
		
	}

});