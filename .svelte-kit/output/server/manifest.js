export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set([]),
	mimeTypes: {},
	_: {
		client: {start:"_app/immutable/entry/start.GfhxfbwE.js",app:"_app/immutable/entry/app.CtLk8tP3.js",imports:["_app/immutable/entry/start.GfhxfbwE.js","_app/immutable/chunks/d9Q-dci0.js","_app/immutable/chunks/FiNyr4Gq.js","_app/immutable/chunks/ZYGFm3CX.js","_app/immutable/chunks/B3JuZd6P.js","_app/immutable/entry/app.CtLk8tP3.js","_app/immutable/chunks/FiNyr4Gq.js","_app/immutable/chunks/Bp9_VTp4.js","_app/immutable/chunks/C5PsJ2pB.js","_app/immutable/chunks/B3JuZd6P.js","_app/immutable/chunks/B6G68pLG.js","_app/immutable/chunks/CL7btXw2.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js'))
		],
		remotes: {
			
		},
		routes: [
			
		],
		prerendered_routes: new Set(["/","/play/","/privacy/"]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();
