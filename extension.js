const vscode = require('vscode');
const http = require("http");
const fs = require('fs');
const path = require('path');

class Preview_Server{
	constructor(port){
		this.files = new Map();
		this.port = port;
		this.status = false;
		this.dir = "";
		this.main = "";
	}

	regFile(key, value){
		this.files.set(key, value);
	}

	write(name, text){
		
		fs.writeFile('server'+ this.files.get(name) +'.html', text, 'utf8', (err) => {
			if (err) throw err;
			console.log('The file has been saved!');
		  });
		console.log(name + ": " + this.files.get(name));
	}

	setDir(dir, mainFile){
		this.dir = dir;
		this.main = mainFile;
	}

	start(){
		this.server = http.createServer((req, res) => {
			if(req.url == "/")
			{
				fs.readFile('server'+ this.files.get(this.main) +'.html', { encoding: 'utf8' }, function(error, file) {
					if (!error) {
						res.writeHead(200, { 'Content-Type': 'text/html'});
						res.write(file);
						res.end();
					}
				});
			}
			if(this.files.has(req.url))
			switch (path.extname(req.url)) {
				case ".css":
					fs.readFile('server'+ this.files.get(req.url) +'.html', { encoding: 'utf8' }, function(error, file) {
						if (!error) {
							res.writeHead(200, { 'Content-Type': 'text/css'});
							res.write(file);
							res.end();
						}
					});
				  break;
				case ".js":
					fs.readFile('server'+ this.files.get(req.url) +'.html', { encoding: 'utf8' }, function(error, file) {
						if (!error) {
							res.writeHead(200, { 'Content-Type': 'text/javascript'});
							res.write(file);
							res.end();
						}
					});
				  break;
				case ".html":
					fs.readFile('server'+ this.files.get(req.url) +'.html', { encoding: 'utf8' }, function(error, file) {
						if (!error) {
							res.writeHead(200, { 'Content-Type': 'text/html'});
							res.write(file);
							res.end();
						}
					});
				  break;
				case ".jpg":
					fs.readFile(this.dir + req.url, function(error, file) {
						if (!error) {
							res.setHeader('Content-Type', 'image/jpg');
							res.write(file);
							res.end();
						}
					});						
				  break;
				case ".gif":
					fs.readFile(this.dir + req.url, function(error, file) {
						if (!error) {
							res.setHeader('Content-Type', 'image/gif');
							res.write(file);
							res.end();
						}
					});						
				  break;
				case ".png":
					fs.readFile(this.dir + req.url, function(error, file) {
						if (!error) {
							res.setHeader('Content-Type', 'image/png');
							res.write(file);
							res.end();
						}
					});						
				  break;
				default:
					res.writeHead(404, { 'Content-Type': 'text/html'});
					res.end("<h1>404 - page not found!</h1>");
					break;
			  }
		  }).listen(this.port)
		  this.status = true;
		  console.log("Server started!");
	}

	stop(){
		if(this.status){
			this.server.close();
			console.log("Server stopped!");
		}
		this.status = false;
	}

	refresh(){
		this.stop();
		this.start();
	}
}

async function activate(context) {
	const server = new Preview_Server(8080);
	var k = 0;
	
	var directory = "";
	let panel;

	vscode.commands.registerCommand('htmlhelper.selectIndexFile', async function () {
		let path = vscode.window.activeTextEditor.document.uri.path.toString();
		
		let n = path.lastIndexOf('/');
		let file = path.substring(n, path.length);
		path = path.substring(0, n+1);
		
		directory = path.substring(1, path.length);
		
		server.setDir(directory, file)

		panel = vscode.window.createWebviewPanel(
			'htmlhelper.openBrowser',
			'htmlHelper: Preview',
			vscode.ViewColumn.Two,
			{
				enableScripts: true
			}
		);
	});

	context.subscriptions.push(
	  	vscode.commands.registerCommand('htmlhelper.openBrowser', () => {
		if(directory != ""){

			panel = vscode.window.createWebviewPanel(
			'htmlhelper.openBrowser',
			'htmlHelper: Preview',
			vscode.ViewColumn.Two,
			{
				enableScripts: true
			}
			);

			panel.webview.html = `
			<html>
				<header>
					<style>
						body, html, div {
							margin: 0;
							padding: 0;
							width: 100%;
							height: 100%;
							overflow: hidden;
							background-color: #fff;
						}
					</style>
				</header>
				<body>
					<div>
						<iframe src="http://127.0.0.1:8080" width="100%" height="100%" seamless frameborder=0>
						</iframe>
					</div>
				</body>
			</html>
		`;
		}
		})
	);

	function reloadBrowser(){
		var text;
		let m;
		try {
			text = vscode.window.activeTextEditor.document.getText();
			m = vscode.window.activeTextEditor.document.uri.path.toString();
		} catch (error) {
			console.log(error);
		}
		
		let filename = m.substring(directory.length, m.length);
		
		if(!server.files.has(filename)){
			server.regFile(filename, k);
		}
			
		server.write(filename, text);
		server.refresh();

		if(path.extname(filename) == ".html")
		panel.webview.html = `
        <html>
            <header>
                <style>
                    body, html, div {
                        margin: 0;
                        padding: 0;
                        width: 100%;
                        height: 100%;
                        overflow: hidden;
                        background-color: #fff;
                    }
                </style>
            </header>
            <body>
                <div>
                    <iframe src="http://127.0.0.1:8080`+ filename +`" width="100%" height="100%" seamless frameborder=0>
                    </iframe>
                </div>
            </body>
        </html>
		`;

		vscode.commands.executeCommand('workbench.action.webview.reloadWebviewAction');
	}

	vscode.window.onDidChangeActiveTextEditor(async function () {
		if(directory != ""){
			reloadBrowser();
		}
	})

	context.subscriptions.push(
	vscode.workspace.onDidChangeTextDocument(async function () {
		if(directory != ""){
			reloadBrowser();
		}
	})
	);

			let disposable = vscode.commands.registerCommand('htmlhelper.startServer', async function () {
				if(server.status){
					return;
				}

				if(directory == ""){
					vscode.window.showInformationMessage("Please select project folder!");
					return;
				}
		
				let files = fs.readdirSync(directory);
				let server_files = [];
		
				while(k < files.length){
					if(path.extname(files[k]) == ".css" || path.extname(files[k]) == ".js" || path.extname(files[k]) == ".html" || path.extname(files[k]) == ".jpg" || path.extname(files[k]) == ".gif"){
						server_files.push('/' + files[k]);
					} 
					else if(fs.lstatSync(directory + files[k]).isDirectory()) {
						let dir_files = fs.readdirSync(directory + files[k]);
						dir_files.forEach(element => {
							files.push(files[k] + '/' + element);
						})
					}
					k++;
				}
		
				console.log("fs");
				server_files.forEach(element => {
					let t = fs.readFileSync(directory + element, "utf8");
					server.regFile(element, k);
					server.write(element, t);
					k++;
				});
				console.log("fe");
			
				console.log(server_files);

				reloadBrowser();
			});

	context.subscriptions.push(disposable);
}
exports.activate = activate;

function deactivate() {}

module.exports = {
	activate,
	deactivate
}
