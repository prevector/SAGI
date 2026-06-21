package com.buddha.agent;

import com.badlogic.gdx.graphics.Color;
import com.badlogic.gdx.math.MathUtils;
import com.badlogic.gdx.math.Vector2;
import com.buddha.math.BVector;
import com.buddha.neural.Brain;
import com.buddha.neural.FFNN;
import com.buddha.neural.GRU;
import com.buddha.phys3d.Particle3;
import com.buddha.phys3d.Skeleton;
import com.buddha.simulation.Properties;
import com.buddha.simulation.Timer;
import com.buddha.world.Circle;

public class Agent implements DepthComparable {
	
	public Circle circle;
	public float direction;
	public float turnSpeed = 0.6f;
	public float speed = 0.1f;
	public float fov = MathUtils.PI2;
	
	public Genotype gene;
	public Brain brain;
	public BVector input;
	public BVector output;
	public Skeleton skeleton;
	public Team team;
	public Timer inactive;	//wether hit or dead
	public Timer seizure;
	public Timer kick;
	public boolean hasHitBall = false;
	public float cutoff;
	public InputModel inputModel;
	public BallCollisionHandler ballHandler = new BallCollisionHandler(3);
	public Color color;
	public boolean selected;
	public boolean grabbed;
	public boolean editable = true;
	public Vector2 target;
	public boolean hasGRU;
	
	//gene properties
	public Color skinColor;
	public Color shoeColor;
	public Color hairColor;
	
	public Agent(float x, float y, Team team, Genotype gene) {
		this.gene = gene;
		this.team = team;
		this.cutoff = Properties.current.getFProperty("cutoff");
		this.inputModel = gene.inputModel;
		this.circle = new Circle(x, y, 1f, 1f);
		circle.particle.friction = 0.8f;
		int inputSize = inputModel.getSize();
		if(gene.properties.getSProperty("brain type") == "FFNN") {
			brain = new FFNN(inputSize, gene.properties.getIProperty("layer size"), 5, gene.properties.getIProperty("hidden layers"));
		} else {
			brain = new GRU(inputSize, 5+gene.properties.getIProperty("layer size"));
			hasGRU = true;
		}
		brain.build(gene.weights);
		this.input = new BVector(inputSize);
		float knockout = Properties.current.getFProperty("knockout");
		inactive = new Timer((int)(knockout*60));
		kick = new Timer(7);
		updateGenes();
	}
	
	public Agent(float x, float y) {
		this.circle = new Circle(x, y, 1f, 1f);
		circle.particle.friction = 0.8f;
		float knockout = Properties.current.getFProperty("knockout");
		inactive = new Timer((int)(knockout*60));
		color = getRandomColor();
		this.gene = new Genotype(new Properties().defaultPlayer());
		skeleton = new Skeleton(x, y, gene.properties.getFProperty("length"));
		updateGenes();
	}
	
	public Agent(float x, float y, Genotype gene, Color color) {
		this.circle = new Circle(x, y, 1f, 1f);
		circle.particle.friction = 0.8f;
		float knockout = Properties.current.getFProperty("knockout");
		inactive = new Timer((int)(knockout*60));
		this.color = color;
		this.gene = gene;
		skeleton = new Skeleton(x, y, gene.properties.getFProperty("length"));
		updateGenes();
	}
	
	public void updateGenes() {
		skinColor = Genotype.skinColors[gene.properties.getIProperty("skin color")];
		shoeColor = Genotype.shoeColors[gene.properties.getIProperty("shoe color")];
		hairColor = Genotype.hairColors[gene.properties.getIProperty("hair color")];
		if(skeleton!=null) skeleton.setUnit(gene.properties.getFProperty("length"));
	}
	
	public void update2() {
		this.inactive.update();
		updateSkeleton();
		if(seizure!=null && seizure.update()) {
			
		} else {
			this.move(MathUtils.random());
			this.turn(MathUtils.random()*0.6f-0.3f);
		}
	}
	
	public void update() {
		output = brain.update(input);
		if(seizure!=null && seizure.update()) {
			for(int i = 0; i < output.size; i++) {
				output.vec[i] = MathUtils.random(-1f,1f);
			}
		}
		this.inactive.update();
		if(kick!=null) {
			if(kick.enabled && !kick.update()) {
				if(skeleton!=null) skeleton.stopKicking();
			}
		}
		if(!inactive() && !isKicking()) {
			move((output.vec[0]+1)/2f);
			turn((output.vec[1]+1)/2f);
			turn(-(output.vec[2]+1)/2f);
		}
		if(skeleton!=null) {
			updateSkeleton();
		}
	}
	
	public void setTeam(Team team) {
		this.team = team;
	}
	
	public void setInput(float[] input) {
		this.input.vec = input;
	}
	
	public Skeleton getSkeleton() {
		if(skeleton==null) {
			skeleton=new Skeleton(circle.getX(), circle.getY(), gene.properties.getFProperty("length"));
		}
		return skeleton;
	}
	
	public boolean hasSeizure() {
		return seizure!=null && seizure.enabled;
	}
	
	public void updateSkeleton() {
		if(!inactive() && (seizure==null || !seizure.enabled) && !isKicking()) {
			skeleton.move();
		}
		if(hasSeizure()) {
			skeleton.seizure();
			circle.particle.pos.set(skeleton.getAverage2DPos());
			skeleton.setFriction(0.97f);
		}  else {
			skeleton.setFriction(skeleton.friction);
		}
		skeleton.setPosition(this);
		if(!isKicking() && !hasSeizure()) {
			skeleton.moveFeet();
		} 
		skeleton.update(direction);
	}
	
	public void grabbed(float x, float y, float z) {
		this.seizure();
		circle.particle.pos.set(x, y);
		if(skeleton!=null) {
			skeleton.get(3).pos.set(x, y, z);
		}
	}
	
	public void turn(float alpha) {
		direction+=alpha*turnSpeed;
		if(direction < -MathUtils.PI) {
			direction+=MathUtils.PI2;
		} 
		if(direction > MathUtils.PI) {
			direction-=MathUtils.PI2;
		}
	}
	
	public void move(float fac) {
		circle.particle.addImpulse(MathUtils.cos(direction)*speed*fac, MathUtils.sin(direction)*speed*fac);
	}

	public void setState(float x, float y, float angle) {
		this.circle.particle.pos.set(x, y);
		direction = angle;
		this.circle.particle.resetVel();
	}

	public void hitBall(Ball ball) {
		hasHitBall = true;
		ballHandler.handleCollision(this, ball);
		if(skeleton!=null) {
			skeleton.hitBall(ball);
		}
	}
	
	public void hit() {
		this.inactive.start();
	}
	
	public boolean inactive() {
		return inactive.enabled;
	}
	
	public float getDepth() {
		return circle.getY();
	}
	
	public static float calcAngle(Agent a, Vector2 v) {
		float dx = v.x-a.circle.particle.pos.x;
		float dy = v.y-a.circle.particle.pos.y;
		float diff = MathUtils.atan2(dy, dx)-a.direction;
		return angDiff(diff);
	}
	
	public static float angDiff(float diff) {
		if(diff > MathUtils.PI) {
			diff-=MathUtils.PI2;
		}
		if(diff < -MathUtils.PI) {
			diff+=MathUtils.PI2;
		}
		return diff; 
	}
	
	public static float calcDist(Agent a, Vector2 v, float cutoff) {
		float dst = v.dst(a.circle.particle.pos);
		return 1f-Math.min(cutoff, dst)/cutoff;
	}
	
	public static void collision(Agent a1, Agent a2, boolean hardcore) {
		//switch
		if(MathUtils.randomBoolean()) {
			Agent temp = a1;
			a1 = a2;
			a2 = temp;
		}
		if(!a1.inactive() && !a2.inactive()) {
			if(MathUtils.randomBoolean(0.03f)) {
				if(hardcore) {
					a2.hit();
				}
				if(a1.skeleton!=null && a2.skeleton!=null) {
					float force = 4f+(hardcore ? 10f : 0f);
					float dx = a2.circle.getX()-a1.circle.getX();
					float dy = a2.circle.getY()-a1.circle.getY();
					float radsum = (a1.circle.radius+a2.circle.radius);
					dx/=radsum;
					dy/=radsum;
					Particle3 hand = MathUtils.randomBoolean() ? a1.skeleton.get(3) : a1.skeleton.get(5);
					hand.pos.set(a2.skeleton.get(1).pos);
					a2.skeleton.get(1).addImpulse(dx*force, dy*force, 0);
				}
			}
		}
	}

	public void seizure() {
		if(seizure==null) {
			seizure = new Timer(80);
		}
		seizure.reset();
		seizure.start();
	}
	
	public boolean isKicking() {
		if(kick==null) {
			return false;
		} else {
			return kick.enabled;
		}
	}

	public void kick(float kickX, float kickY, float angle, float magnitude) {
		if(kick.enabled) return;
		kick.reset();
		kick.start();
		if(skeleton!=null) {
			skeleton.kick(kickX, kickY, angle, magnitude);
		}
	}

	public void knockout() {
		inactive.start();
	}


	public int getGeneIdx() {
		return team.genotypes.indexOf(gene, true);
	}
	
	public Color getColor() {
		if(team!=null) 
			return team.color;
		else 
			return color;
	}
	
	public static void friendlyCollision(Agent a1, Agent a2) {
		Vector2 middle = new Vector2(a2.circle.particle.pos).add(a1.circle.particle.pos);
		middle.scl(0.5f);
		a1.skeleton.lhand.pos.set(middle.x, middle.y, a1.skeleton.unit*2);
		a2.skeleton.lhand.pos.set(middle.x, middle.y, a1.skeleton.unit*2);
	}
	
	public static String generateRandomName() {
		String name = "";
		String[] syllables = new String[]{"tim", "hein", "ege", "ube", "lal", "fa", "ba", "la", "bu", "ni", 
				"noi", "po", "op", "geg", "ri", "ro", "na", "ldo", "ti", "tu", "vri", "ein", "das", "land",
				"dal", "tuk", "ger", "gert", "paa", "erd", "nie", "van", "dat", "lul", "en", "ari", "elle", 
				"pe", "nis", "an", "al", "ar", "hans", "sha", "pak", "stan", "bert", "paul", "jan", "kees", 
				"brad", "chad"};
		int s1 = MathUtils.random(1, 3);
		int s2 = MathUtils.random(1, 3);
		for(int i = 0; i < s1; i++) {
			name+=syllables[MathUtils.random(syllables.length-1)];
		}
		name+=" ";
		for(int i = 0; i < s2; i++) {
			name+=syllables[MathUtils.random(syllables.length-1)];
		}
		return name;
	}
	
	public static Color getRandomColor() {
		return Team.colors[MathUtils.random(Team.colors.length-1)];
	}

}
