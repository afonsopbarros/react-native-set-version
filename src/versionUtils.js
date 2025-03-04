const trimText = (s) => {
  const indexOfString = s.search(/[^\d]/);
  let result = s;

  if (indexOfString > 0) {
    result = s.substring(0, indexOfString);
  }

  return result;
};

const versionEquals = (versionA, versionB) => (
  versionA.major === versionB.major
  && versionA.minor === versionB.minor
  && versionA.patch === versionB.patch
);

const versionStringToVersion = (versionString, currentVersion, currentVersionCode) => {
  const versionParts = versionString.split('.');
  let build = 1;
  if (currentVersion && versionEquals(currentVersion, versionStringToVersion(versionString))) {
    const newVersionCode = (currentVersionCode + 1).toString();
    build = +(newVersionCode.substr(newVersionCode.length - 1));
    if (build === 0) {
      throw new Error('Sorry you have more than 10 builds using that version consider bumping version or change your version manually');
    }
  }

  return {
    major: +trimText(versionParts[0] || '0'),
    minor: +trimText(versionParts[1] || '1'),
    patch: +trimText(versionParts[2] || '0'),
    build,
  };
};

module.exports = {
  versionStringToVersion,
};
