{ pkgs, inputs, ... }: {
  programs.noctalia = {
    enable = true;
    systemd.enable = true;
  };
}
