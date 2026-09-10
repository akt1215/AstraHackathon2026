import {defineConfig,loadEnv} from 'vite';
import {generationApi} from './server/generation-api.js';
export default defineConfig(({mode})=>({plugins:[{name:'local-game-generation',configureServer(server){server.middlewares.use(generationApi({...loadEnv(mode,process.cwd(),''),...process.env}))}}]}));
