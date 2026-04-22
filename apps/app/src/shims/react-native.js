/**
 * App-local shim for `react-native` that wraps Text and TextInput so
 * Inter font families are applied via fontFamily (needed on Android where
 * fontWeight alone doesn't select a custom face).
 *
 * Uses a Proxy instead of `{ ...RN }` spread so that lazy native-module
 * getters on the real `react-native` module are never accessed eagerly —
 * that would crash in Expo Go which doesn't bundle every native module.
 */
const React = require("react");
// Bypass our own shim: resolve the real react-native from node_modules.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const RN = require("react-native/index");

function resolveInterFamily(weight) {
  const w = weight == null ? "400" : String(weight);
  if (w === "700" || w === "bold") return "Inter_700Bold";
  if (w === "600") return "Inter_600SemiBold";
  if (w === "500") return "Inter_500Medium";
  const n = Number(w);
  if (!Number.isNaN(n) && n >= 700) return "Inter_700Bold";
  if (!Number.isNaN(n) && n >= 600) return "Inter_600SemiBold";
  if (!Number.isNaN(n) && n >= 500) return "Inter_500Medium";
  return "Inter_400Regular";
}

function withInterStyle(style) {
  if (style == null) return { fontFamily: "Inter_400Regular" };
  const flat = RN.StyleSheet.flatten(style);
  if (!flat || flat.fontFamily) return style;
  return [style, { fontFamily: resolveInterFamily(flat.fontWeight) }];
}

const Text = React.forwardRef(function Text(props, ref) {
  return React.createElement(RN.Text, {
    ...props,
    ref,
    style: withInterStyle(props.style),
  });
});
Text.displayName = "Text";

const TextInput = React.forwardRef(function TextInput(props, ref) {
  return React.createElement(RN.TextInput, {
    ...props,
    ref,
    style: withInterStyle(props.style),
  });
});
TextInput.displayName = "TextInput";

// Proxy: only intercept Text / TextInput; everything else goes directly to RN.
module.exports = new Proxy(RN, {
  get(target, prop, receiver) {
    if (prop === "Text") return Text;
    if (prop === "TextInput") return TextInput;
    return Reflect.get(target, prop, receiver);
  },
});
