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
in
{
  # Home Manager needs a bit of information about you and the paths it should
  # manage.
  home.username = "harid";
  home.homeDirectory = "/home/harid";

  # This value determines the Home Manager release that your configuration is
  # compatible with. This helps avoid breakage when a new Home Manager release
  # introduces backwards incompatible changes.
  #
  # You should not change this value, even if you update Home Manager. If you do
  # want to update the value, then make sure to first check the Home Manager
  # release notes.
  home.stateVersion = "26.05"; # Please read the comment before changing.

  # The home.packages option allows you to install Nix packages into your
  # environment  

  home.packages = [
    # # Adds the 'hello' command to your environment. It prints a friendly
    # # "Hello, world!" when run.
    # pkgs.hello

    # # It is sometimes useful to fine-tune packages, for example, by applying
    # # overrides. You can do that directly here, just don't forget the
    # # parentheses. Maybe you want to install Nerd Fonts with a limited number of
    # # fonts?
    # (pkgs.nerdfonts.override { fonts = [ "FantasqueSansMono" ]; })

    # # You can also create simple shell scripts directly inside your
    # # configuration. For example, this adds a command 'my-hello' to your
    # # environment:
    # (pkgs.writeShellScriptBin "my-hello" ''
    #   echo "Hello, ${config.home.username}!"
    # '')
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
        frebuild = "sudo nixos-rebuild switch --flake /etc/nixos#nixos";
        commit = "cd /etc/nixos && sudo git add -A && sudo git commit -m 'generic commit'";
      };
    };

    atuin = {
      enable = true;
      enableZshIntegration = true;
    };

    oh-my-posh = {
      enable = true;
      useTheme = "catppuccin_mocha";
    };

    spicetify = {
      enable = true;
      enabledExtensions = with spicePkgs.extensions; [
        betterGenres
        playNext
        fullAlbumDate
        hidePodcasts
        shuffle
        beautifulLyrics
      ];

      theme = {
        name = "Lucid";
        src = pkgs.fetchFromGitLab {
          owner = "sanoojes";
          repo = "spicetify-lucid";
          rev = "main";
          hash = "sha256-J2DlDHs1CHQCfMSwqDAtUzqukWdI3/kQTXl6BoRsBWc=";
        };
      };
#     theme = spicePkgs.themes.catppuccin;
#     colorScheme = "mocha";
    };
  };


  # Home Manager is pretty good at managing dotfiles. The primary way to manage
  # plain files is through 'home.file'.
  home.file = {
    # # Building this configuration will create a copy of 'dotfiles/screenrc' in
    # # the Nix store. Activating the configuration will then make '~/.screenrc' a
    # # symlink to the Nix store copy.
    # ".screenrc".source = dotfiles/screenrc;

    # # You can also set the file content immediately.
    # ".gradle/gradle.properties".text = ''
    #   org.gradle.console=verbose
    #   org.gradle.daemon.idletimeout=3600000
    # '';
  };

  # Home Manager can also manage your environment variables through
  # 'home.sessionVariables'. These will be explicitly sourced when using a
  # shell provided by Home Manager. If you don't want to manage your shell
  # through Home Manager then you have to manually source 'hm-session-vars.sh'
  # located at either
  #
  #  ~/.nix-profile/etc/profile.d/hm-session-vars.sh
  #
  # or
  #
  #  ~/.local/state/nix/profiles/profile/etc/profile.d/hm-session-vars.sh
  #
  # or
  #
  #  /etc/profiles/per-user/harid/etc/profile.d/hm-session-vars.sh
  #
  home.sessionVariables = {
    # EDITOR = "emacs";
  };

  # Let Home Manager install and manage itself.
  programs.home-manager.enable = true;
}
