/**
 * @type {import('semantic-release').GlobalConfig}
 */
module.exports = {
  branches: [
    'release', // production releases
    {
      name: 'pre-release',
      prerelease: true
    }
  ],
  plugins: [
    '@semantic-release/commit-analyzer',
    '@semantic-release/release-notes-generator',
    '@semantic-release/changelog',
    '@semantic-release/github',
    [
      "@semantic-release/github",
      {
        "assets": [
          {
            "path": "*.vsix",
            "label": "Cline VSCode Extension"
          }
        ]
      }
    ]
    ['@semantic-release/git', {
      assets: ['CHANGELOG.md', 'package.json'],
      message: 'chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}'
    }]
  ]
};
