document.addEventListener('DOMContentLoaded', () => {
  const menuIcon = document.querySelector('.menu-icon i');
  const menu = document.querySelector('.menu');

  menuIcon.addEventListener('click', () => {
    menu.classList.toggle('show');

    if(menu.classList.contains('show')) {
      menuIcon.classList.remove('fa-bars');
      menuIcon.classList.add('fa-times');
    } else {
      menuIcon.classList.remove('fa-times');
      menuIcon.classList.add('fa-bars');
    }
  });
});
