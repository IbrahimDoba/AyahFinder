module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./src'],
          alias: {
            '@': './src',
            '@/presentation': './src/presentation',
            '@/domain': './src/domain',
            '@/data': './src/data',
            '@/services': './src/services',
            '@/utils': './src/utils',
            '@/constants': './src/constants',
            '@/types': './src/types',
          },
        },
      ],
      [
        'module:react-native-dotenv',
        {
          moduleName: '@env',
          path: '.env',
        },
      ],
      // 'uniwind/babel', // Removed - causing package export errors
      'react-native-reanimated/plugin', // Must be last
    ],
  };
};
