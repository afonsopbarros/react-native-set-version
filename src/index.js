#!/usr/bin/env node

import chalk from 'chalk';
import fs from 'fs';
import g2js from 'gradle-to-js/lib/parser';
import path from 'path';
import plist from 'plist';

import { versionStringToVersion } from './versionUtils';

const display = console.log; // eslint-disable-line no-console

const paths = {
  androidManifest: './android/app/src/main/AndroidManifest.xml',
  buildGradle: './android/app/build.gradle',
  infoPlist: './ios/<APP_NAME>/Info.plist',
  packageJson: './app.json',
};

function setPackageVersion(versionText, versionCode, platform) {
  let packageJSON = null;
  try {
    packageJSON = JSON.parse(fs.readFileSync(paths.packageJson));
    display(chalk.yellow(`Will set package version to ${chalk.bold.underline(versionText)}`));
    packageJSON.version = versionText;
    if (platform === "ios") {
      packageJSON.ios_version.marketing = versionText
      packageJSON.ios_version.build = versionCode
    } else if (platform === "android") {
      packageJSON.android_version.name = versionText
      packageJSON.android_version.code = versionCode
    }
    fs.writeFileSync(paths.packageJson, `${JSON.stringify(packageJSON, null, '\t')}\n`);
    display(chalk.green(`Version replaced in ${chalk.bold('package.json')}`));
  } catch (err) {
    display(chalk.red(`${chalk.bold.underline('ERROR:')} Cannot find file with name ${path.resolve(paths.packageJson)}`));
    process.exit(1);
  }
  return packageJSON;
}


function getIOSVersionInfo(newVersionName, newVersionCode) {
  let versionInfo = {
    currentVersionCode: null,
    currentVersion: null,
    version: null,
    versionCode: null,
  };

  try {
    const plistInfo = plist.parse(fs.readFileSync(paths.infoPlist, 'utf8'));
    const currentVersion = versionStringToVersion(plistInfo.CFBundleShortVersionString);
    const versionCodeParts = plistInfo.CFBundleVersion.toString().split('.');
    const currentVersionCode = +(versionCodeParts[versionCodeParts.length - 1]);
    const version = versionStringToVersion(newVersionName, currentVersion, currentVersionCode);
    versionInfo = {
      currentVersionCode,
      currentVersion,
      version,
      versionCode: newVersionCode,
    };
  } catch (err) {
    display(chalk.yellowBright(`${chalk.bold.underline('WARNING:')} Cannot find key CFBundleShortVersionString in file ${path.resolve(paths.infoPlist)}. IOS version configuration will be skipped`));
  }
  return versionInfo;
}

async function setIosApplicationVersion(newVersionName, newVersionCode) {
  const { version } = await getIOSVersionInfo(newVersionName, newVersionCode);
  // const bundleVersion = `${version.major}.${version.minor}.${version.patch}.${version.build}`;
  if (version) {
    display('');
    display(chalk.yellow('IOS version info:'));
    display(version);

    display('');

    display(chalk.yellow(`Will set CFBundleShortVersionString to ${chalk.bold.underline(newVersionName)}`));
    display(chalk.yellow(`Will set CFBundleVersion to ${chalk.bold.underline(newVersionCode)}`));
    try {
      const plistInfo = plist.parse(fs.readFileSync(paths.infoPlist, 'utf8'));
      plistInfo.CFBundleShortVersionString = newVersionName;
      plistInfo.CFBundleVersion = newVersionCode;
      fs.writeFileSync(paths.infoPlist, plist.build(plistInfo), 'utf8');
      display(chalk.green(`Version replaced in ${chalk.bold('Info.plist')}`));
    } catch (err) {
      display(chalk.yellowBright(`${chalk.bold.underline('WARNING:')} Cannot find file with name ${path.resolve(paths.infoPlist)}. This file will be skipped`));
    }
  }
}

async function getAndroidVersionInfo(newVersionName, newVersionCode) {
  let versionInfo = {
    currentVersionCode: null,
    currentVersion: null,
    version: null,
    versionCode: null,
  };
  try {
    const gradle = await g2js.parseFile(paths.buildGradle);
    const currentVersion = versionStringToVersion(gradle.android.defaultConfig.versionName);
    const currentVersionCode = +(gradle.android.defaultConfig.versionCode);
    const version = versionStringToVersion(newVersionName, currentVersion, currentVersionCode);
    versionInfo = {
      currentVersionCode,
      currentVersion,
      version,
      versionCode: newVersionCode,
    };
  } catch (err) {
    display(chalk.yellowBright(`${chalk.bold.underline('WARNING:')} Cannot find attribute versionCode in file ${path.resolve(paths.buildGradle)}. Android version configuration will be skipped`));
  }
  return versionInfo;
}

async function setAndroidApplicationVersion(newVersionName, newVersionCode) {
  const { version, versionCode } = await getAndroidVersionInfo(newVersionName, newVersionCode);

  if (versionCode) {
    display('');
    display(chalk.yellow('Android version info:'));
    display(version);

    display('');

    display(chalk.yellow(`Will set Android version to ${chalk.bold.underline(newVersionName)}`));
    display(chalk.yellow(`Will set Android version code to ${chalk.bold.underline(versionCode)}`));
    try {
      const buildGradle = fs.readFileSync(paths.buildGradle, 'utf8');
      const newBuildGradle = buildGradle.replace(/versionCode \d+/g, `versionCode ${versionCode}`)
        .replace(/versionName "[^"]*"/g, `versionName "${newVersionName}"`);

      fs.writeFileSync(paths.buildGradle, newBuildGradle, 'utf8');
      display(chalk.green(`Version replaced in ${chalk.bold('build.gradle')}`));
    } catch (err) {
      display(chalk.yellowBright(`${chalk.bold.underline('WARNING:')} Cannot find file with name ${path.resolve(paths.buildGradle)}. This file will be skipped`));
    }

    try {
      const androidManifest = fs.readFileSync(paths.androidManifest, 'utf8');
      if (androidManifest.includes('android:versionCode') || androidManifest.includes('android:versionName')) {
        const newAndroidManifest = androidManifest.replace(/android:versionCode="\d*"/g, `android:versionCode="${versionCode}"`)
          .replace(/android:versionName="[^"]*"/g, `android:versionName="${newVersionName}"`);

        fs.writeFileSync(paths.androidManifest, newAndroidManifest, 'utf8');
        display(chalk.green(`Version replaced in ${chalk.bold('AndroidManifest.xml')}`));
      }
    } catch (err) {
      display(chalk.yellowBright(`${chalk.bold.underline('WARNING:')} Cannot find file with name ${path.resolve(paths.androidManifest)}. This file will be skipped`));
    }
  }
}

const changeVersion = async () => {
  display(chalk.yellow(`---------------------`));
  display(chalk.yellow(`Usage example:`));
  display(chalk.yellow(`command ${chalk.bold('set-version 1.0.1 2 ios')} set versions (marketing and build number) only for iOS`));
  display(chalk.yellow(`command ${chalk.bold('set-version 1.0.1 2 android')} set versions (versionName and versionCode) only for Android`));
  display(chalk.yellow(`command ${chalk.bold('set-version 1.0.1')} set version only on package.json because not platform was selected`));
  display(chalk.yellow(`---------------------`));
  display('');

  const newVersionName = process.argv[2];
  const newVersionCode = process.argv[3];
  const platform = process.argv[4];
  const appName = setPackageVersion(newVersionName, newVersionCode, platform).name;
  
  display('');

  if (platform === "ios") {
    display(chalk.yellow(`Platform selected: ${chalk.bold.underline('iOS')}`));
    paths.infoPlist = paths.infoPlist.replace('<APP_NAME>', appName);
    await setIosApplicationVersion(newVersionName, newVersionCode);
  } else if (platform === "android") {
    display(chalk.yellow(`Platform selected: ${chalk.bold.underline('Android')}`));
    await setAndroidApplicationVersion(newVersionName, newVersionCode);
  } else {
    display(chalk.green(`Only package version was changed`));
  }

  display('');
};

changeVersion();
