import { spawnSync } from 'node:child_process';
import {
  copyFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync,
  rmSync, writeFileSync,
} from 'node:fs';
import { basename, delimiter, dirname, join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const android = dirname(fileURLToPath(import.meta.url));
const project = dirname(android);
const source = join(android, 'app', 'src', 'main');
const dist = join(project, 'dist');
const executable = process.platform === 'win32' ? '.exe' : '';
const require = createRequire(import.meta.url);

function requirePath(file) {
  if (!existsSync(file)) throw new Error(`Arquivo ou pasta ausente: ${file}`);
  return file;
}

function requiredEnvironment(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Defina ${name} para gerar o APK.`);
  return resolve(value);
}

function newest(directory, select) {
  const versions = readdirSync(requirePath(directory)).filter(select);
  versions.sort((first, second) => second.localeCompare(first, 'en', { numeric: true }));
  if (!versions.length) throw new Error(`Nenhuma versão compatível em ${directory}.`);
  return join(directory, versions[0]);
}

function run(program, args, cwd = project) {
  const result = spawnSync(requirePath(program), args, { cwd, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${basename(program)} terminou com código ${result.status}.`);
}

function verifyArchive(jar, apk) {
  const listing = spawnSync(jar, ['--list', '--file', apk], { encoding: 'utf8' });
  if (listing.error) throw listing.error;
  if (listing.status !== 0) throw new Error(listing.stderr || 'Não foi possível conferir o APK.');
  const names = new Set(listing.stdout.trim().split(/\r?\n/));
  const required = ['AndroidManifest.xml', 'classes.dex', 'assets/web/index.html', 'assets/web/app.js'];
  if (required.some(name => !names.has(name)) || [...names].some(name => name.includes('\\'))) {
    throw new Error('Os arquivos internos do APK têm caminhos inválidos.');
  }
}

async function bundleWebApp(web) {
  const esbuildPath = process.env.EVENTIFY_ESBUILD_PATH || 'esbuild';
  let esbuild;
  try {
    esbuild = require(esbuildPath);
  } catch (error) {
    if (esbuildPath !== 'esbuild' || error.code !== 'MODULE_NOT_FOUND') throw error;
    throw new Error('Instale o esbuild com npm install --no-save esbuild@0.28.2.');
  }

  const index = readFileSync(join(project, 'index.html'), 'utf8');
  const webEntry = '<script type="module" src="/src/main.ts"></script>';
  if (!index.includes(webEntry)) throw new Error('O script de entrada está ausente no index.html.');
  writeFileSync(join(web, 'index.html'), index.replace(webEntry, '<script defer src="/app.js"></script>'));

  const { outputFiles } = await esbuild.build({
    absWorkingDir: project,
    entryPoints: ['./src/main.ts'],
    bundle: true,
    format: 'iife',
    target: 'chrome74',
    charset: 'utf8',
    tsconfigRaw: {},
    write: false,
    plugins: [{
      name: 'eventify-source',
      setup(build) {
        // Read modules directly so packaging also works where parent folders cannot be listed.
        build.onResolve({ filter: /^\.\.?\// }, args => ({
          path: resolve(args.resolveDir || project, args.path),
          namespace: 'eventify-source',
        }));
        build.onLoad({ filter: /\.ts$/, namespace: 'eventify-source' }, args => ({
          contents: readFileSync(args.path, 'utf8'),
          loader: 'ts',
          resolveDir: dirname(args.path),
        }));
      },
    }],
  });
  writeFileSync(join(web, 'app.js'), outputFiles[0].contents);
}

async function build() {
  const sdk = requiredEnvironment('ANDROID_HOME');
  const javaBin = join(requiredEnvironment('JAVA_HOME'), 'bin');
  const kotlinLib = join(requiredEnvironment('KOTLIN_HOME'), 'lib');
  const java = join(javaBin, 'java' + executable);
  const jar = join(javaBin, 'jar' + executable);
  const keytool = join(javaBin, 'keytool' + executable);
  const platform = newest(join(sdk, 'platforms'), name => /^android-\d+(?:\.\d+)?$/.test(name)
    && Number(name.split('-')[1]) >= 35);
  const androidJar = requirePath(join(platform, 'android.jar'));
  const buildTools = newest(join(sdk, 'build-tools'), name => /^\d+(?:\.\d+)+$/.test(name)
    && Number(name.split('.')[0]) >= 35);
  const stdlib = requirePath(join(kotlinLib, 'kotlin-stdlib.jar'));
  const manifest = join(source, 'AndroidManifest.xml');
  const minSdk = readFileSync(manifest, 'utf8').match(/android:minSdkVersion="(\d+)"/)[1];
  const compilerClasspath = join(kotlinLib, '*');

  mkdirSync(dist, { recursive: true });
  const staging = mkdtempSync(join(dist, '.android-'));
  try {
    const assets = join(staging, 'assets');
    const web = join(assets, 'web');
    const resources = join(staging, 'res');
    const icons = join(resources, 'mipmap-nodpi');
    const dex = join(staging, 'dex');
    const buildTool = name => join(buildTools, name + executable);
    const buildJar = name => join(buildTools, 'lib', name + '.jar');
    mkdirSync(web, { recursive: true });
    for (const file of ['styles.css', 'mobile.css', 'manifest.webmanifest']) {
      copyFileSync(join(project, file), join(web, file));
    }
    cpSync(join(android, 'licenses'), join(assets, 'licenses'), { recursive: true });
    cpSync(join(project, 'assets'), join(web, 'assets'), { recursive: true });
    await bundleWebApp(web);

    cpSync(join(source, 'res'), resources, { recursive: true });
    mkdirSync(icons, { recursive: true });
    copyFileSync(join(web, 'assets', 'eventify-icon-192.png'), join(icons, 'ic_launcher.png'));
    const compiledResources = join(staging, 'resources.zip');
    const unsigned = join(staging, 'unsigned.apk');
    run(buildTool('aapt2'), ['compile', '--dir', resources, '-o', compiledResources]);
    run(buildTool('aapt2'), ['link', '-I', androidJar, '--manifest', manifest,
      '-o', unsigned, compiledResources]);

    const kotlinSources = join(source, 'kotlin', 'br', 'com', 'eventify', 'app');
    const sources = readdirSync(kotlinSources).filter(name => name.endsWith('.kt')).map(name => join(kotlinSources, name));
    const classes = join(staging, 'eventify.jar');
    run(java, ['-cp', compilerClasspath, 'org.jetbrains.kotlin.cli.jvm.K2JVMCompiler',
      '-no-stdlib', '-no-reflect', '-no-jdk', '-classpath', [androidJar, stdlib].join(delimiter),
      '-jvm-target', '1.8', '-d', classes, ...sources]);
    mkdirSync(dex);
    run(java, ['-cp', buildJar('d8'), 'com.android.tools.r8.D8', '--min-api', minSdk,
      '--lib', androidJar, '--output', dex, classes, stdlib]);
    const dexEntries = readdirSync(dex).filter(name => name.endsWith('.dex')).flatMap(name => ['-C', dex, name]);
    // JAR writes canonical ZIP paths even on Windows. AssetManager requires forward slashes.
    run(jar, ['--update', '--file', unsigned, '--no-manifest', '-C', staging, 'assets', ...dexEntries]);
    verifyArchive(jar, unsigned);

    const aligned = join(staging, 'aligned.apk');
    const signed = join(staging, 'Eventify.apk');
    run(buildTool('zipalign'), ['-P', '16', '-f', '4', unsigned, aligned]);
    const key = join(dist, '.eventify-test.p12');
    if (!existsSync(key)) {
      run(keytool, ['-genkeypair', '-keystore', key, '-storetype', 'PKCS12', '-storepass', 'android',
        '-alias', 'eventify-test', '-keyalg', 'RSA', '-keysize', '2048', '-validity', '10000',
        '-dname', 'CN=Eventify Teste Android']);
    }
    const signer = ['-jar', buildJar('apksigner')];
    run(java, [...signer, 'sign', '--ks', key, '--ks-key-alias', 'eventify-test',
      '--v2-signing-enabled', 'true', '--v3-signing-enabled', 'true',
      '--ks-pass', 'pass:android', '--out', signed, aligned]);
    run(java, [...signer, 'verify', '--verbose', signed]);
    run(buildTool('zipalign'), ['-c', '-P', '16', '4', signed]);
    const output = join(dist, 'Eventify.apk');
    copyFileSync(signed, output);
    console.log(`APK: ${output}`);
  } finally {
    if (dirname(staging) === dist && basename(staging).startsWith('.android-')) {
      rmSync(staging, { recursive: true, force: true });
    }
  }
}

try {
  await build();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
