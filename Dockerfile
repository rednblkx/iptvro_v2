FROM denoland/deno:1.28.3

# The port that your application listens to.
EXPOSE 3000

WORKDIR /app

RUN chown -R 1000:1000 /deno-dir

# Prefer not to run as root.
USER 1000:1000

# Cache the dependencies as a layer (the following two steps are re-run only when deps.ts is modified).
# Ideally cache deps.ts will download and compile _all_ external files used in main.ts.
#COPY iptvro_v2 .
#RUN deno cache iptvro_v2/src/index.ts

#WORKDIR iptvro_v2

# These steps will be re-run upon each file change in your working directory:
ADD . .
# Compile the main app so that it doesn't need to be compiled each startup/entry.
RUN deno cache src/index.ts

CMD ["run", "--allow-net", "--allow-write", "--allow-read", "--allow-env", "src/index.ts"]
