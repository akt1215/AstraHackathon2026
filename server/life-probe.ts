import { LifeSimulation } from '../shared/life/simulation';
import { LifeModel } from './life-model';

const sim = new LifeSimulation();
sim.command({ worldId: sim.state().id, requestId: 'probe-walk', command: { kind: 'walk', x: 2, z: 3.5 } });
for (let i = 0; i < 30; i++) sim.tick(.1);
const request = sim.beginTalk('june', 'Your cooking smells wonderful. Could we share lunch and talk about your day?');
const model = new LifeModel();
console.log(JSON.stringify({ provider: model.info() }));
try {
  const decision = await model.react(request);
  const applied = sim.applyReaction(request, decision);
  console.log(JSON.stringify({ provider: model.info(), decision, applied, activity: sim.state().residents.find(r => r.id === 'june')?.activity, events: sim.state().events.slice(-2) }));
} catch (error) {
  console.log(JSON.stringify({ provider: model.info(), error: error instanceof Error ? error.message : 'Probe failed' }));
  process.exitCode = 1;
}
