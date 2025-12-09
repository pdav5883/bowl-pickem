// Navbar configuration for bowl-pickem project
// This file allows easy customization of navbar elements

export const navbarConfig = {
  // Brand/logo configuration
  brand: {
    image: './assets/favicon.ico',
    link: '/',
    alt: 'Bowl Pickem logo'
  },
  
  sections: [
    {
      type: 'link',
      label: 'Scoreboard',
      url: '/'
    },
    {
      type: 'link',
      label: 'Picks',
      url: '/picks.html'
    },
    {
      type: 'dropdown',
      label: 'More',
      items: [
        { name: 'About <em>bowl-pickem</em>', url: '/about.html' },
        { name: 'See the Code on GitHub', url: 'https://github.com/pdav5883/bowl-pickem' },
        { name: 'Bear Loves Rocks', url: 'https://home.bearloves.rocks' }
      ]
    }
  ],

  hideSignin: true
};
