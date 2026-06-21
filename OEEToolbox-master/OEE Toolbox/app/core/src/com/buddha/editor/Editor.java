package com.buddha.editor;

import com.badlogic.gdx.math.MathUtils;
import com.badlogic.gdx.math.Vector2;
import com.badlogic.gdx.math.Vector3;
import com.badlogic.gdx.utils.Array;
import com.buddha.agent.Agent;
import com.buddha.agent.DepthComparable;
import com.buddha.agent.Genotype;
import com.buddha.agent.Team;
import com.buddha.phys3d.Particle3;
import com.buddha.simulation.Properties;
import com.buddha.simulation.Simulation;
import com.buddha.world.AABB;
import com.buddha.world.Circle;
import com.buddha.world.World;

public class Editor {

	public Array<Agent> agents = new Array<Agent>();
	public Array<CloningMachine> cloningMachines = new Array<CloningMachine>();
	public Array<TeslaCoil> teslaCoils = new Array<TeslaCoil>();
	public Array<DepthComparable> entities = new Array<DepthComparable>();
	public Array<Ray> rays = new Array<Ray>();
	public Array<WorldButton> worldButtons = new Array<WorldButton>();
	public World world;
	public static final AABB bounds = new AABB(0, -30, Simulation.bounds.x2, -2);
	public Array<DustParticle> dustParticles = new Array<DustParticle>();
	public Array<Incinerator> incinerators = new Array<Incinerator>();
	public Array<Flame> flames = new Array<Flame>();

	// for setup
	public boolean setupChanged = true;
	public Array<StartPosition> startPositions = new Array<StartPosition>();
	public Array<Agent> positioned = new Array<Agent>();
	public Agent grabbed = null;
	public Array<Properties> teamProperties = new Array<Properties>();
	public Agent selected;
	public Agent deleteFromMemory = null;

	public Editor() {
		world = new World();
		world.setBounds(bounds);
		addCloningMachine(new CloningMachine(15, -20));
		startSetup();
		Agent proto = new Agent(10, 10);
		addAgent(proto);
		positionAgent(proto, startPositions.get(0));
		for (int i = 1; i < 11; i++) {
			StartPosition sp = startPositions.get(i);
			Agent clone = new Agent(sp.region.getCX(), sp.region.getCY(), proto.gene, proto.color);
			addAgent(clone);
			this.positionAgent(clone, sp);
		}
		WorldButton addAgent = new WorldButton(-6, -7, 5, 5);
		worldButtons.add(addAgent);
		incinerators.add(new Incinerator(bounds.x1 - 30, bounds.y1, 12, 12));
	}

	private void startSetup() {
		for (AABB lRegion : Team.startPositionsLeft) {
			startPositions.add(new StartPosition(lRegion));
		}
	}

	public void populate(Array<Genotype> savedGenes) {
		for (Genotype gene : savedGenes) {
			Agent agent = new Agent(MathUtils.random() + 20, MathUtils.random() - 20, gene, Agent.getRandomColor());
			agent.editable = false;
			addAgent(agent);
		}
	}

	public void update() {
		world.update();
		selected = null;
		for (int i = agents.size - 1; i >= 0; i--) {
			Agent a = agents.get(i);
			a.update2();
			if (a.target != null) {
				a.direction = MathUtils.atan2(a.circle.getY() - a.target.y, a.circle.getX() - a.target.x)
						+ MathUtils.PI;
				if (a.circle.particle.pos.dst(a.target) < 1) {
					a.target = null;
					positioned.removeValue(a, true);
				}
			}
			if (a.grabbed) {
				if (grabbed == null) {
					grab(a);
				}
			}
			if (a.selected) {
				this.selected = a;
				a.updateGenes();
				for (Agent a2 : agents) {
					if (a2.gene == a.gene)
						a2.updateGenes();
				}
			}
		}
		float dist = 1000000;
		Incinerator inc = incinerators.get(0);
		if (grabbed != null) {
			dist = inc.bounds.getCenter().dst(grabbed.circle.particle.pos);
		}
		float tw = MathUtils.clamp(20 - dist, 0, 14);
		inc.bounds.setWidth(inc.bounds.getWidth() - (inc.bounds.getWidth() - tw) * 0.15f);
		inc.bounds.setCenter(-15, bounds.y1 + 6.5f);
		if (grabbed != null && !grabbed.grabbed) {
			release(grabbed);
		}
		for (int i = cloningMachines.size - 1; i >= 0; i--) {
			CloningMachine cm = cloningMachines.get(i);
			cm.update();
		}
		for (int i = rays.size - 1; i >= 0; i--) {
			Ray ray = rays.get(i);
			ray.update();
			if (!ray.timer.enabled) {
				rays.removeIndex(i);
				entities.removeValue(ray, true);
			}
		}
		for (int i = dustParticles.size - 1; i >= 0; i--) {
			DustParticle dp = dustParticles.get(i);
			dp.update();
			if (!dp.timer.enabled) {
				dustParticles.removeIndex(i);
				entities.removeValue(dp, true);
			}
		}
		for (WorldButton wb : worldButtons) {
			if (wb.clicked) {
				float x = cloningMachines.get(0).getX();
				float y = cloningMachines.get(0).getY();
				Agent agent = new Agent(x, y);
				spawn(agent);
			}
		}
		for (int i = flames.size - 1; i >= 0; i--) {
			Flame flame = flames.get(i);
			flame.update();
			if (!flame.timer.enabled) {
				flames.removeIndex(i);
				entities.removeValue(flame, true);
			}
		}
		for (Incinerator incinerator : incinerators) {
			incinerator.update(this);
		}
		checkCollisions();
	}

	public void checkCollisions() {
		for (Agent agent : agents) {
			if (!positioned.contains(agent, true)) {
				if (!agent.grabbed) {
					if (AABB.insideCollisions(world.bounds, agent.circle)) {
						agent.direction += MathUtils.random(-3, 3);
					}
					for (Particle3 p : agent.skeleton.particles) {
						AABB.insideCollisions(bounds, p);
					}
				}
			}
		}
		for (StartPosition position : startPositions) {
			if (position.agent != null) {
				if (AABB.insideCollisions(position.region, position.agent.circle)) {
					position.agent.direction += MathUtils.random(-3, 3);
				}
				for (Particle3 p : position.agent.skeleton.particles) {
					AABB.insideCollisions(position.region, p);
				}
			}
		}
		for (int i = 0; i < agents.size - 1; i++) {
			Agent a1 = agents.get(i);
			for (int j = i + 1; j < agents.size; j++) {
				Agent a2 = agents.get(j);
				if (Circle.overlaps(a1.circle, a2.circle)) {
					World.solveCollision(a1.circle, a2.circle);
				}
			}
		}
		for (Agent agent : agents) {
			for (TeslaCoil coil : teslaCoils) {
				if (Circle.overlaps(coil.circle, agent.circle)) {
					World.solveCollision(coil.circle, agent.circle);
					if (agent.hasSeizure())
						continue;
					coil.zap(agent);
					agent.seizure();
					Vector3 from = new Vector3(coil.circle.getX(), coil.circle.getY(), coil.height);
					for (int i = 0; i < 3; i++) {
						addRay(new Ray(from,
								agent.skeleton.particles.get(MathUtils.random(agent.skeleton.particles.size - 1)).pos));
					}
				}
			}
		}
	}

	public void grab(Agent a) {
		if (positioned.contains(a, true)) {
			for (StartPosition sp : startPositions) {
				if (sp.agent == a) {
					removeAgent(a, sp);
				}
			}
		} else {
			positioned.add(a);
		}
		grabbed = a;
		a.target = null;
	}

	public void release(Agent a) {
		System.out.println("release agent");
		grabbed = null;
		boolean placed = false;
		for (StartPosition sp : startPositions) {
			if (sp.region.contains(a.circle.getX(), a.circle.getY())) {
				positionAgent(a, sp);
				placed = true;
			}
		}
		if (!placed) {
			if (incinerators.get(0).bounds.contains(a.circle.getX(), a.circle.getY())) {
				burn(a);
			}
			a.target = new Vector2(MathUtils.clamp(a.circle.getX(), bounds.x1 + 2, bounds.x2 - 2), -10);
		}
	}

	public void burn(Agent agent) {
		for (Particle3 p : agent.skeleton.particles) {
			addDustParticle(new DustParticle(p.pos.x, p.pos.y, p.pos.z, 1));
			addDustParticle(new DustParticle(p.pos.x, p.pos.y, p.pos.z, 1));
		}
		if (!agent.editable) {
			int count = 0;
			for (Agent a : agents) {
				if (a.gene == agent.gene)
					count++;
			}
			if (count == 1) {
				this.deleteFromMemory = agent;
			}
		}
		removeAgent(agent);
	}

	public void clone(Agent a) {
		CloningMachine cm = cloningMachines.get(0);
		float x = cm.getX();
		float y = cm.getY();
		Agent clone = new Agent(x, y, a.gene, a.color);
		clone.editable = a.editable;
		spawn(clone);
	}

	public void spawn(Agent agent) {
		for (Particle3 p : agent.skeleton.particles) {
			addDustParticle(new DustParticle(p.pos.x, p.pos.y, p.pos.z));
			addDustParticle(new DustParticle(p.pos.x + MathUtils.randomTriangular(),
					p.pos.y + MathUtils.randomTriangular(), p.pos.z + MathUtils.randomTriangular()));
			TeslaCoil coil = teslaCoils.get(MathUtils.random(teslaCoils.size - 1));
			Vector3 from = new Vector3(coil.circle.getX(), coil.circle.getY(), coil.height);
			this.addRay(new Ray(from, p.pos));
		}
		addAgent(agent);
	}

	public boolean inWaitingroom(Genotype gene) {
		for (Agent a : agents) {
			if (positioned.contains(a, true)) {
				continue;
			} else {
				if (a.gene == gene) {
					return true;
				}
			}
		}
		return false;
	}

	public void positionAgent(Agent a, StartPosition sp) {
		if (sp.agent != null) {
			removeAgent(sp.agent, sp);
		}
		sp.agent = a;
		if (!positioned.contains(a, true))
			positioned.add(a);
		if (!inWaitingroom(a.gene)) {
			clone(a);
		}
		this.setupChanged = true;
	}

	public void addDustParticle(DustParticle particle) {
		dustParticles.add(particle);
		entities.add(particle);
	}

	public void addFlame(Flame flame) {
		flames.add(flame);
		entities.add(flame);
	}

	public void removeAgent(Agent a, StartPosition sp) {
		sp.agent.target = new Vector2(a.circle.getX(), -10);
		sp.agent = null;
		this.setupChanged = true;
	}

	public void addRay(Ray ray) {
		rays.add(ray);
		entities.add(ray);
	}

	public void addCloningMachine(CloningMachine cloningMachine) {
		cloningMachines.add(cloningMachine);
		teslaCoils.addAll(cloningMachine.teslaCoils);
		entities.addAll(cloningMachine.teslaCoils);
		entities.add(cloningMachine);
	}

	public void addAgent(Agent agent) {
		agents.add(agent);
		world.addCircle(agent.circle);
		entities.add(agent);
	}

	public void removeAgent(Agent agent) {
		agents.removeValue(agent, true);
		world.circles.removeValue(agent.circle, true);
		entities.removeValue(agent, true);
	}

	public Agent select(Vector2 pos) {
		Agent agent = null;
		for (Agent a : agents) {
			if (a.circle.particle.pos.dst2(pos.x, pos.y - 3) < 14) {
				agent = a;
			}
		}
		return agent;
	}

	public void click(Vector2 pos, boolean clicked) {
		for (WorldButton wb : worldButtons) {
			if (wb.bounds.contains(pos.x, pos.y) && clicked) {
				wb.clicked();
			} else {
				wb.clicked = false;
			}
		}
	}

	public void mouseOver(Vector2 pos, boolean down) {
		for (WorldButton wb : worldButtons) {
			if (wb.bounds.contains(pos.x, pos.y)) {
				wb.highlighted = true;
				wb.down = down;
			} else {
				wb.down = false;
				wb.highlighted = false;
			}
		}
	}

	public Team getTeam() {
		Team team = new Team();
		for (int i = 0; i < startPositions.size; i++) {
			StartPosition sp = startPositions.get(i);
			team.addPlayer(sp.agent.gene, i);
			if (sp.agent.editable) {
				sp.agent.gene.resetGene();
			}
		}
		team.setProperties(getTeamProperties());
		return team;
	}

	public Array<Properties> getTeamProperties() {
		for (int i = 0; i < startPositions.size; i++) {
			StartPosition sp = startPositions.get(i);
			if (sp.agent != null) {
				String name = sp.agent.gene.properties.getSProperty("name");
				boolean duplicate = false;
				for (Properties p : teamProperties) {
					if (p.getSProperty("name") == name) {
						duplicate = true;
						break;
					}
				}
				if (!duplicate) {
					Properties prop = new Properties();
					prop.setBProperty("train", true);
					prop.setSProperty("name", name);
					teamProperties.add(prop);
				}
			}
		}
		for (int i = teamProperties.size - 1; i >= 0; i--) {
			String name = teamProperties.get(i).getSProperty("name");
			boolean inPosition = false;
			for (StartPosition sp : startPositions) {
				if (sp.agent == null)
					continue;
				if (sp.agent.gene.properties.getSProperty("name") == name) {
					inPosition = true;
					break;
				}
			}
			if (!inPosition) {
				teamProperties.removeIndex(i);
			}
		}
		return teamProperties;
	}

	public boolean positionsFilled() {
		for (StartPosition sp : startPositions) {
			if (sp.agent == null)
				return false;
		}
		return true;
	}
}
