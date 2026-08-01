{ config, pkgs, inputs, ... }:

{
  imports =
    [
      ./hardware-configuration.nix
    ];

  ## BOOTLOADER ##
  boot.loader.limine.enable = true;
  boot.loader.limine.secureBoot.enable = true;
  boot.loader.efi.canTouchEfiVariables = true;

  ## KERNEL ##
  boot.kernelPackages = pkgs.linuxPackages_latest;
  
  boot.extraModulePackages = [ config.boot.kernelPackages.v4l2loopback ];
  boot.extraModprobeConfig = '' options v4l2loopback devices=1 video_nr=10 card_label="VirtualCam" exclusive_caps=1 '';
  boot.kernelModules = [ "v4l2loopback" ];

  ## NETWORKING ##
  networking.networkmanager.enable = true;
  networking.wireless.enable = true;
  hardware.bluetooth.enable = true;
  services.power-profiles-daemon.enable = true;
  services.upower.enable = true;
  services.openssh.enable = true;

  ## HOSTNAME ##
  networking.hostName = "HaridPC";

  ## LOCALES ##
  time.timeZone = "Europe/Tallinn";

  i18n.defaultLocale = "en_US.UTF-8";

  i18n.extraLocaleSettings = {
    LC_ADDRESS = "et_EE.UTF-8";
    LC_MEASUREMENT = "et_EE.UTF-8";
    LC_MONETARY = "et_EE.UTF-8";
    LC_NAME = "et_EE.UTF-8";
    LC_NUMERIC = "et_EE.UTF-8";
    LC_TELEPHONE = "et_EE.UTF-8";
    LC_TIME = "en_US.UTF-8";
  };

  services.xserver.xkb = {
    layout = "us";
    variant = "";
  };
  
  ## FONTS ##
  fonts.packages = with pkgs; [
    noto-fonts
    nerd-fonts.fira-code
    nerd-fonts.inconsolata-go
    rubik
  ];

  ## ZSH SETUP ##
  users.defaultUserShell = pkgs.zsh;
  programs.zsh.enable = true;
  

  ## USER ##
  users.users."harid" = {
    isNormalUser = true;
    description = "Harid";
    extraGroups = [ "networkmanager" "wheel" ];
    packages = with pkgs; [];
  };

  nix.settings.trusted-users = [ "root" "harid"];  
  nix.settings.experimental-features = [ "nix-command" "flakes" ];
  # Allow unfree packages
  nixpkgs.config.allowUnfree = true;

  environment.etc."xdg/menus/applications.menu".source = "${pkgs.kdePackages.plasma-workspace}/etc/xdg/menus/plasma-applications.menu";

  ## PACKAGES ##
  environment.systemPackages = with pkgs; [
  	lsd
	wget
	bluez-tools
	bluez
	sbctl
	protonup-qt
	protontricks
	wine64
	yt-dlp
	pwvucontrol
	git
        kitty
        firefox
        kdePackages.dolphin
	kdePackages.ark
        kdePackages.kio-admin
	kdePackages.kio
	kdePackages.kio-fuse
	kdePackages.kio-extras
	kdePackages.kservice
	kdePackages.gwenview
	kdePackages.qtsvg
	kdePackages.qtstyleplugin-kvantum
	libsForQt5.qt5ct
	kdePackages.qt6ct
	hyprland-qt-support
	hyprpicker
	hyprpolkitagent
	hyprshutdown
	grimblast
	playerctl
	gamescope
	steam
	steam-run
	copyq
	ayugram-desktop
	(discord.override {
        withOpenASAR = true;
        withVencord = true;
        })
	libnotify
        fastfetch
        vscodium
        obs-studio
	killall
	inputs.zen-browser.packages.${pkgs.stdenv.hostPlatform.system}.default
	inputs.noctalia.packages.${pkgs.stdenv.hostPlatform.system}.default
  ];

  ## PROGRAMS ##
  programs = {
    hyprland = {
      enable = true;
      xwayland.enable = true;
    };

    steam = {
      enable = true;
    };
  };
  
  security.polkit.enable = true;


  system.stateVersion = "26.05";
}
