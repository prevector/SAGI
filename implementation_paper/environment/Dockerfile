# hash:sha256:66aca43487805f981f1e4dcf62cfae0d260ab864901677b6b06a51897a44430b
FROM registry.codeocean.com/codeocean/miniconda3:4.7.10-cuda10.1-cudnn7-ubuntu18.04

ARG DEBIAN_FRONTEND=noninteractive

RUN conda install -y \
        pytorch==1.3.1 \
        seaborn==0.9.0 \
    && conda clean -ya
