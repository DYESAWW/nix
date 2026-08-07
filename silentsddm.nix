{ inputs, ... }: {
  imports = [ inputs.silentSDDM.nixosModules.default ];
  programs.silentSDDM = {
    enable = true;
    theme = "catppuccin-mocha";

    backgrounds = {
      mywall = ./themes/background.jpg;
    };

    settings = {
      "LoginScreen" = {
        background = "background.jpg";
      };
    };
  };
}
