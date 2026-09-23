{ config, pkgs, inputs, ... }:
let
  spicePkgs = inputs.spicetify-nix.legacyPackages.${pkgs.stdenv.hostPlatform.system};

  ellenJoeCursor = pkgs.stdenvNoCC.mkDerivation {
    pname = "ellen-joe-cursor";
    version = "1.0";
    src = ./cursors/Ellen-Joe;
    dontBuild = true;
    installPhase = ''
      mkdir -p $out/share/icons/Ellen-Joe
      cp -r $src/* $out/share/icons/Ellen-Joe/
    '';
  };

  pkgs-py310 = import inputs.nixpkgs-python310 {
    system = pkgs.stdenv.hostPlatform.system;
  };

  
in
{
  home.username = "DYESAW";
  home.homeDirectory = "/home/DYESAW";

  home.stateVersion = "26.05";

  home.packages = [
	pkgs.spicetify-cli
  pkgs-py310.python310
  ];

  home.pointerCursor = {
    enable = true;
    name = "Ellen-Joe";
    package = ellenJoeCursor;
    size = 24;
    x11.enable = true;
    gtk.enable = true;
    hyprcursor.enable = true;
  };
 
  qt = {
  enable = true;
  platformTheme.name = "kvantum";
  style.name = "kvantum";
  };

  programs = {
    zsh = {
      enable = true;
      shellAliases = {
        ls = "lsd -a";
        try = "nix-shell -p";
        batt = "dualsensectl battery";
        hswitch = "home-manager switch";
        rebuild = "sudo nixos-rebuild switch";
        hconf = "sudo nano /etc/nixos/home.nix";
        sysconf = "sudo nano /etc/nixos/configuration.nix";
        flake = "sudo nano /etc/nixos/flake.nix";
        frebuild = "sudo nixos-rebuild switch --flake /etc/nixos#DYESAW-PC";
        commit = "cd /etc/nixos && sudo git add -A && sudo git commit -m 'generic commit' && sudo git push -u origin main";
      };
      
      initContent = "source /home/DYESAW/.zsh/catppuccin_mocha-zsh-syntax-highlighting.zsh";

      oh-my-zsh = {
        enable = true;
        plugins = [ "git" ];
      };

      plugins = [
        {
          name = "zsh-autocomplete";
          src = pkgs.fetchFromGitHub {
          owner = "marlonrichert";
          repo = "zsh-autocomplete";
          rev = "23.07.13";
          sha256 = "sha256-/6V6IHwB5p0GT1u5SAiUa20LjFDSrMo731jFBq/bnpw=";
          };
        }

        {
          name = "zsh-syntax-highlighting";
          src = pkgs.fetchFromGitHub {
          owner = "zsh-users";
          repo = "zsh-syntax-highlighting";
          rev = "0.8.0";
          sha256 = "sha256-iJdWopZwHpSyYl5/FQXEW7gl/SrKaYDEtTH9cGP7iPo=";
          };
        }

        {
          name = "zsh-autosuggestions";
          src = pkgs.fetchFromGitHub {
          owner = "zsh-users";
          repo = "zsh-autosuggestions";
          rev = "v0.7.0";
          sha256 = "sha256-KLUYpUu4DHRumQZ3w59m9aTW6TBKMCXl2UcKi4uMd7w=";
          };
        }
      ];
    };

    atuin = {
      enable = true;
      enableZshIntegration = true;
    };

    oh-my-posh = {
      enable = true;
      useTheme = "catppuccin_mocha";
    };

    git = {
      enable = true;
    };

    spicetify = {
      enable = true;
      wayland = true;
      enabledExtensions = with spicePkgs.extensions; [
        copyLyrics
#				betterGenres
				spicyLyrics 
        playNext
        fullAlbumDate
        hidePodcasts
        shuffle
	      beautifulLyrics
        copyToClipboard
	      volumePercentage
      ];

      theme = {
        name = "Lucid";
        src = ./themes/Lucid;
      };
    };
  };

  home.file = {

  };

  home.sessionVariables = {

  };

  programs.home-manager.enable = true;
}
