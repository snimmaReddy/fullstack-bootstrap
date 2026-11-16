import { Alert, AppShell, Badge, Box, Burger, Group, NavLink, ScrollArea, Skeleton, Text, ThemeIcon } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconAlertTriangle, IconBolt, IconLayoutDashboard, IconPointFilled } from '@tabler/icons-react';
import { useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useCount, useEntities, useHealth } from '../api/hooks';
import { ErrorState } from '../components/StateViews';
import type { Entity } from '../entity/types';
import { customPages } from './entities';
import { APP_NAME } from './theme';

/** App shell: header, left sidebar (dashboard, entities, custom pages) and the page area. */
export function AppLayout() {
  const [opened, { toggle, close }] = useDisclosure();
  const { pathname } = useLocation();
  const { entities, problems, schemaErrors, isLoading, error, refetch } = useEntities();
  const health = useHealth();

  useEffect(close, [pathname, close]); // close the mobile menu after navigating

  const isActive = (path: string) => pathname === path || pathname.startsWith(`${path}/`);

  return (
    <AppShell
      header={{ height: 56 }}
      navbar={{ width: 264, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="lg"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group gap="sm">
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" aria-label="Toggle navigation" />
            <ThemeIcon size={30} radius="md" variant="gradient" gradient={{ from: 'indigo', to: 'violet', deg: 135 }}>
              <IconBolt size={18} />
            </ThemeIcon>
            <Text fw={700} size="lg">{APP_NAME}</Text>
          </Group>
          <Badge
            variant="light"
            color={health.isError ? 'red' : health.isSuccess ? 'teal' : 'gray'}
            leftSection={<IconPointFilled size={12} />}
          >
            {health.isError ? 'Database unavailable' : health.isSuccess ? 'Connected' : 'Connecting…'}
          </Badge>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="sm">
        <AppShell.Section grow component={ScrollArea}>
          <NavLink component={Link} to="/" label="Dashboard" active={pathname === '/'}
            leftSection={<IconLayoutDashboard size={18} stroke={1.5} />} />

          <SectionLabel>Data</SectionLabel>
          {isLoading && [1, 2].map((i) => <Skeleton key={i} height={32} my={4} radius="md" />)}
          {entities.map((e) => (
            <EntityNavLink key={e.path} entity={e} active={isActive(`/${e.path}`)} />
          ))}

          {customPages.length > 0 && <SectionLabel>Pages</SectionLabel>}
          {customPages.map((p) => (
            <NavLink key={p.path} component={Link} to={`/${p.path}`} label={p.label} active={isActive(`/${p.path}`)}
              leftSection={p.icon && <p.icon size={18} stroke={1.5} />} />
          ))}
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main bg="gray.0">
        <Box maw={1200} mx="auto">
          {error && <Box mb="lg"><ErrorState title="Couldn't reach the API" error={error} onRetry={() => refetch()} /></Box>}
          {[...problems, ...schemaErrors.map((e) => `${e.file}: ${e.message}`)].map((msg) => (
            <Alert key={msg} mb="md" color="yellow" variant="light" icon={<IconAlertTriangle size={18} />}>{msg}</Alert>
          ))}
          <Outlet />
        </Box>
      </AppShell.Main>
    </AppShell>
  );
}

function SectionLabel({ children }: { children: string }) {
  return <Text size="xs" fw={600} c="dimmed" tt="uppercase" px="sm" mt="lg" mb={6}>{children}</Text>;
}

function EntityNavLink({ entity, active }: { entity: Entity; active: boolean }) {
  const count = useCount(entity.endpoint);
  return (
    <NavLink
      component={Link}
      to={`/${entity.path}`}
      label={entity.title}
      active={active}
      leftSection={<entity.icon size={18} stroke={1.5} />}
      rightSection={count.data !== undefined && (
        <Badge size="sm" variant={active ? 'filled' : 'light'} color={active ? 'indigo' : 'gray'} circle={count.data < 10}>
          {count.data}
        </Badge>
      )}
    />
  );
}
