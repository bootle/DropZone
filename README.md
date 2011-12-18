DropZone
=========

A modular crossbrowser uploader class for Mootools.
Based on MooUpload by Juan Lago,
also inspired by Swiff.Uploader, Form.Upload & jQuery Aquantum.


Features
--------

+ HTML5 chunk upload 
+ Flash upload 
+ HTML4 upload 
+ Automatic selection of available method 
+ Multiple file selection 
+ Autostart upload
+ Progress tracking 
+ Semi-Automatic file list control (to show progress for multiple 
files, cancel etc.) 
+ Minimum and maximum file size detection 
+ Asynchronous file upload (only with HTML5 and Flash) 
+ Selector file type filter (Works only with Flash and partially with 
HTML5) 
+ Modal architecture (for example Flash module can just not be 
included for HTML5+HTML4 support) 
+ No visible HTML within the class, UI is very flexible and fully 
independent 
+ The class adapts to use elements of UI provided (eg. only a button, or button with list, and/or drag & drop etc.)
+ Image data collection for instant thumbnail output (HTML5 only) 
+ Drag and drop uploads (HTML5 only) 
+ Additional vars can be added (eg. upload_to_project: 1) 
...


Screenshots
-----------

#![Screenshot 1](http://files.droplr.com/files_production/acc_3220/cQry?AWSAccessKeyId=AKIAJSVQN3Z4K7MT5U2A&Expires=1324240058&Signature=6tpGApFeQnvUumW0fYe17Zl%2FSYI%3D&response-content-disposition=inline%3B+filename%3DScreenshot+2011-12-18+at+21.24.png)

http://d.pr/cQry

Dependencies
------------

+ Mootools 1.4.0
	+ Elements.Event
	+ Swiff


How to Use
----------

See demo: http://thebootle.com/foof/moo/DropZone/Demo/