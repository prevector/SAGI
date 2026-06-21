package com.buddha.neural;

import java.util.function.Function;

import com.buddha.math.BMatrix;
import com.buddha.math.BVector;

public class GRU extends Brain{

	public int inputSize;
	public int outputSize;

	public static final Function<Float, Float> sigmaG = x -> (float) (1.0 / (1 + Math.exp(-x)));
	public static final Function<Float, Float> sigmaH = x -> (float) Math.tanh(x);

	public BMatrix Wz;
	public BMatrix Uz;
	public BVector bz;
	public BMatrix Wr;
	public BMatrix Ur;
	public BVector br;
	public BMatrix Wh;
	public BMatrix Uh;
	public BVector bh;

	public BVector h;

	public GRU(int inputSize, int outputSize) {
		this.inputSize = inputSize;
		this.outputSize = outputSize;
	}
	
	@Override
	public void build(BVector gene) {
		h = new BVector(outputSize);
		int index = 0;
		Wz = new BMatrix(gene.vec, index, outputSize, inputSize);
		index += Wz.size();
		Uz = new BMatrix(gene.vec, index, outputSize, outputSize);
		index += Uz.size();
		bz = new BVector(gene.vec, index, outputSize);
		index += bz.size;

		Wr = new BMatrix(gene.vec, index, outputSize, inputSize);
		index += Wr.size();
		Ur = new BMatrix(gene.vec, index, outputSize, outputSize);
		index += Ur.size();
		br = new BVector(gene.vec, index, outputSize);
		index += br.size;

		Wh = new BMatrix(gene.vec, index, outputSize, inputSize);
		index += Wh.size();
		Uh = new BMatrix(gene.vec, index, outputSize, outputSize);
		index += Uh.size();
		bh = new BVector(gene.vec, index, outputSize);
		index += br.size;
	}

	@Override
	public BVector update(BVector input) {
		// z update
		BVector z = BVector.product(Wz, input);
		z.add(BVector.product(Uz, h));
		z.add(bz);
		z.apply(sigmaG);
		// r update
		BVector r = BVector.product(Wr, input);
		r.add(BVector.product(Ur, h));
		r.add(br);
		r.apply(sigmaG);
		// h update
		BVector newH = BVector.hadamardProd(z, h);
		z.scale(-1).add(1);
		BVector sig = BVector.product(Wh, input);
		sig.add(BVector.product(Uh, BVector.hadamardProd(r, h)));
		sig.add(bh);
		h = BVector.hadamardProd(sig.apply(sigmaH), z).add(newH);
		return h;
	}

	public static int getGeneSize(int input, int output) {
		return (input * output + output * output + output) * 3;
	}
}
