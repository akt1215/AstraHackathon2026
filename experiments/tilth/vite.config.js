import {defineConfig,loadEnv} from 'vite';
import {generationApi} from './server/generation-api.js';
import {worldApi} from './server/world-api.ts';
export default defineConfig(({mode})=>({plugins:[{name:'local-game-generation',configureServer(server){const env={...loadEnv(mode,process.cwd(),''),...process.env};server.middlewares.use(worldApi({env}));server.middlewares.use(generationApi(env))}}]}));
