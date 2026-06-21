package com.buddha.simulation;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.files.FileHandle;
import com.badlogic.gdx.utils.Array;
import com.badlogic.gdx.utils.Json;
import com.buddha.agent.Genotype;
import com.buddha.agent.InputModel;

public class AgentSaver {

	public FileHandle playerFolder;
	public static final String folderName = "players";

	public Json json = new Json();
	Array<Genotype> genes = new Array<Genotype>();

	public AgentSaver() {
		findFolder();
		loadAgents();
	}

	public void findFolder() {
		playerFolder = new FileHandle(Gdx.files.getLocalStoragePath() + "/" + folderName);
		if (!playerFolder.exists()) {
			playerFolder.mkdirs();
		}
	}

	public void loadAgents() {
		genes.clear();
		for (FileHandle handle : playerFolder.list()) {
			if(handle.name().endsWith(".json")) {
				Genotype gene = json.fromJson(Genotype.class, handle);
				gene.buildInputModel();
				genes.add(gene);
			}
		}
	}

	public void save(Genotype genotype) {
		InputModel model = genotype.inputModel;
		genotype.inputModel = null;
		String txt = json.toJson(genotype, Genotype.class);
		genotype.inputModel = model;
		String path = Gdx.files.getLocalStoragePath() + "/" + folderName + "/" + genotype.properties.getSProperty("name")+".json";
		FileHandle handle = new FileHandle(path);
		handle.writeString(txt, false);
	}

	public void delete(String name) {
		FileHandle handle = new FileHandle(Gdx.files.getLocalStoragePath() + "/" + folderName + "/" + name + ".json");
		handle.delete();
	}

}
