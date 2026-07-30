{ pkgs, inputs, ... }: {
  programs.noctalia = {
    enable = true;
    recommendedServices.enable = true;
  };
}
