import { Card, createTheme, Drawer, Modal } from '@mantine/core';

/** App name shown in the header. */
export const APP_NAME = 'Upstart';

/** Look and feel: change the brand colour, font or corner radius here. */
export const theme = createTheme({
  primaryColor: 'indigo',
  defaultRadius: 'md',
  fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  headings: { fontWeight: '650' },
  components: {
    Card: Card.extend({ defaultProps: { withBorder: true, shadow: 'xs', radius: 'md' } }),
    Drawer: Drawer.extend({ defaultProps: { overlayProps: { backgroundOpacity: 0.35, blur: 2 } } }),
    Modal: Modal.extend({ defaultProps: { overlayProps: { backgroundOpacity: 0.35, blur: 2 } } }),
  },
});
