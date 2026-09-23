{ config, pkgs, inputs, ... }:
let
  silent-sddm = pkgs.stdenvNoCC.mkDerivation {
    pname = "silent-sddm";
    version = "1.0";
    src = ./themes/silent-sddm;  # path relative to this .nix file
    installPhase = ''
      mkdir -p $out/share/sddm/themes/silent-sddm
      cp -r $src/* $out/share/sddm/themes/silent-sddm/
    '';
  };
in
{
  imports =
    [
      ./hardware-configuration.nix
    ];

  ## BOOTLOADER ##
  boot.loader.limine.enable = true;
  boot.loader.limine.secureBoot.enable = true;
  boot.loader.efi.canTouchEfiVariables = true;
  boot.loader.limine.extraEntries = ''
  /Windows
    protocol: efi
    path: uuid(83028296-8054-469f-a2ab-36fa299c0c00):/EFI/Microsoft/Boot/bootmgfw.efi
'';

  ## DISPLAY MANAGER ##

  services.displayManager.noctalia-greeter = {
      enable = true;
      greeter-args = "";
      settings = {
        cursor = {
          theme = "Ellen-Joe";
          size = 24;
          path = "/etc/nixos/cursors";
        };
        keyboard = {
          layout = "us";
        };
      };
    };

  ## DISK MOUNTS ##

  boot.supportedFilesystems = [ "ntfs" ];

  fileSystems."/mnt/1" =
    { device = "/dev/disk/by-uuid/C6E62E01E62DF1FB";
      fsType = "ntfs-3g"; 
      options = [ "rw" "uid=1000" "nofail"];
    };

  fileSystems."/mnt/2" =
    { device = "/dev/disk/by-uuid/2A683C46683C1355";
      fsType = "ntfs-3g"; 
      options = [ "rw" "uid=1000" "nofail"];
    };

  ## GRAPHICS ##

	hardware.graphics = {
  	enable = true;
  	enable32Bit = true;
	};

	systemd.tmpfiles.rules = let
	  rocmEnv = pkgs.symlinkJoin {
	    name = "rocm-combined";
	    paths = with pkgs.rocmPackages; [ rocblas hipblas clr ];
	  };
	in [
	  "L+ /opt/rocm - - - - ${rocmEnv}"
	];

	environment.sessionVariables = {
  	HSA_OVERRIDE_GFX_VERSION = "12.0.0";
  	ROCR_VISIBLE_DEVICES = "0";
	};
  hardware.amdgpu.opencl.enable = true;

  ## KERNEL ##
# boot.kernelPackages = pkgs.linuxPackages_latest;
  boot.kernelPackages = pkgs.linuxPackages_zen;
 
  boot.extraModulePackages = [ config.boot.kernelPackages.v4l2loopback ];
  boot.extraModprobeConfig = '' options v4l2loopback devices=1 video_nr=10 card_label="VirtualCam" exclusive_caps=1 '';
  boot.kernelModules = [ "v4l2loopback" ];

  ## NETWORKING ##
  networking.networkmanager.enable = true;
  networking.networkmanager.dns = "systemd-resolved";
  services.resolved.enable = true;
  #networking.wireless.enable = true;
  hardware.bluetooth.enable = true;
  services.power-profiles-daemon.enable = true;
  services.upower.enable = true;
  services.openssh.enable = true;
  services.tailscale.enable = true;
  services.nordvpn.enable = true;
  networking.firewall.enable = false;


## password encryption for wifi
sops.defaultSopsFile = ./secrets/eduroam.yaml;
sops.age.keyFile = "/var/lib/sops-nix/key.txt";
sops.secrets.eduroam-password = {};

networking.networkmanager.ensureProfiles.profiles = {
  eduroam = {
    connection = {
      id = "eduroam";
      type = "wifi";
      autoconnect = true;
      autoconnect-retries = -1;
    };
    wifi = {
      ssid = "eduroam";
      mode = "infrastructure";
      powersave = 2;
    };
    wifi-security = {
      key-mgmt = "wpa-eap";
    };
    "802-1x" = {
      eap = "peap";
      identity = "razdolski@ut.ee";
      phase2-auth = "mschapv2";
      ca-cert = "/etc/nixos/eduroam-ca.pem";
      auth-timeout = 60;
      password-raw = "@${config.sops.secrets.eduroam-password.path}";
    };
    ipv4 = {
      method = "auto";
      dhcp-timeout = 60;
    };
    ipv6.method = "auto";
  };
};

  ## HOSTNAME ##
  networking.hostName = "DYESAW-PC";

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
		noto-fonts-cjk-sans
		noto-fonts-cjk-serif
		noto-fonts-color-emoji
    nerd-fonts.fira-code
    nerd-fonts.inconsolata-go
    rubik
		corefonts
  ];

  ## ZSH SETUP ##
  users.defaultUserShell = pkgs.zsh;
  programs.zsh.enable = true;
  

  ## USER ##
  users.users."DYESAW" = {
    isNormalUser = true;
    description = "DYESAW";
    extraGroups = [ "networkmanager" "wheel" "nordvpn" "video" "render" ];
    packages = with pkgs; [];
  };

  nix.settings.trusted-users = [ "root" "DYESAW"];  
  nix.settings.experimental-features = [ "nix-command" "flakes" ];
  # Allow unfree packages
  nixpkgs.config = {
    allowUnfree = true;
    rocmSupport = true;
    cudaSupport = false;
  };

  environment.etc."xdg/menus/applications.menu".source = "${pkgs.kdePackages.plasma-workspace}/etc/xdg/menus/plasma-applications.menu";

  ## PACKAGES ##

  environment.systemPackages = with pkgs; [
	gcc
	file
	stow
	lsd
	busybox
	wget
	fuse
	bluez-tools
	bluez
	sbctl
	protonup-qt
	protontricks
	wine64
	yt-dlp
	pwvucontrol
	kitty
	firefox
	eartag
	audacity
	vlc
	p7zip
  ffmpeg
  libreoffice-qt
	kdePackages.dolphin
  kdePackages.kfilemetadata
  kdePackages.baloo
	kdePackages.ark
  kdePackages.okular
	rar
  kdePackages.kio-admin
	kdePackages.kio
	kdePackages.kio-fuse
	kdePackages.kio-extras
	kdePackages.kservice
	kdePackages.gwenview
	kdePackages.qtsvg
	kdePackages.qtstyleplugin-kvantum
	libsForQt5.qtstyleplugin-kvantum
	libsForQt5.qt5ct
	kdePackages.qt6ct
	hyprland-qt-support
	hyprpolkitagent
	hyprpicker
  wayscriber
	hyprshutdown
	playerctl
	rocmPackages.rocminfo
  rocmPackages.rocm-smi
	gamescope
	steam
	adwsteamgtk
	steam-run
	osu-lazer-bin
	copyq
	ayugram-desktop
	vesktop
	(discord.override {
#   withOpenASAR = true;
    withVencord = true;
  })
	libnotify
	tailscale
	prismlauncher
  fastfetch
	vscodium
	killall
	inputs.zen-browser.packages.${pkgs.stdenv.hostPlatform.system}.default
	inputs.noctalia.packages.${pkgs.stdenv.hostPlatform.system}.default
  temurin-bin-17
	nordvpn
	fetch
  qbittorrent-enhanced
	python3
	python314
	qdigidoc
	thonny
	obsidian
	dualsensectl
  ];

  programs.nix-ld.enable = true;
  programs.nix-ld.libraries = with pkgs; [
    stdenv.cc.cc.lib
    zlib
    libGL
    glib
    rocmPackages.clr
    rocmPackages.rocblas
    rocmPackages.hipblas
    rocmPackages.rccl
    rocmPackages.miopen
    numactl
  ];

  ## PROGRAMS ##
  programs = {
    hyprland = {
      enable = true;
      withUWSM = true;
      xwayland.enable = true;
    };

    steam = {
      enable = true;
    };

    nano = {
      enable = true;
      nanorc = "set tabsize 2";
    };

    obs-studio = {
    	enable = true;
    	enableVirtualCamera = true;
    	plugins = with pkgs.obs-studio-plugins; [
				droidcam-obs
			];
		};
		git = {
  		enable = true;
  		config = {
    		init.defaultBranch = "main";
				user.email = "haridula@proton.me";
				user.name = "DYESAW";
  		};
  	};

		kdeconnect = {
			enable = true;
		};
  };
	
#	services.lact.enable = true;
	services.syncthing = {
		enable = true;
		systemService = true;
		user = "DYESAW";
  	group = "users";
  	dataDir = "/home/DYESAW/.local/share/syncthing";
  	configDir = "/home/DYESAW/.config/syncthing";
	};

  environment.sessionVariables.XDG_DATA_DIRS = [ "/var/lib/flatpak/exports/share" ];  
  services.flatpak.enable = true;  
  security.polkit.enable = true;
	security.wrappers.pkexec.enable = pkgs.lib.mkForce true;
  services.udisks2.enable = true;
  services.logind.settings.Login = {
    HandlePowerKey = "ignore";
  };

  system.stateVersion = "26.05";
}
