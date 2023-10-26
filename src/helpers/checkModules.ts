import * as Loader from "../loader.ts";

export const valid_modules = await Loader.sanityCheck();

await Loader.cacheCleanup(valid_modules);
setInterval(async () => {
  await Loader.cacheCleanup(valid_modules);
}, 1000 * 60 * 60);

console.log(`\nValid modules: ${valid_modules}\n`);
