import React, { useState } from 'react';
import { Btn, ConfirmDialog, Modal, useToast, fmt } from './index';
import { Icon } from '../lib/icons';
import { useAuth } from '../auth/AuthContext';
import { useSetClientStatus, useChangeClientPlan } from '../api/hooks/useClientMutations';
import { usePlans } from '../api/hooks/usePlans';
import type { ApiError } from '../api/ApiError';
import type { Client, Plan, ClientStatusAction } from '../api/types';

type ActionDef = {
  key: ClientStatusAction; label: string; icon: typeof Icon.zap; perm: string;
  variant?: 'primary' | 'default' | 'danger'; danger?: boolean;
  confirm?: { title: string; message: string; confirmLabel: string };
  toast: { title: string; msg: string; kind?: 'success' | 'info' };
};

const ACTIONS: Record<ClientStatusAction, ActionDef> = {
  start_trial: { key: 'start_trial', label: 'Start trial', icon: Icon.zap, perm: 'clients.start_trial', variant: 'primary',
    confirm: { title: 'Start a new trial?', message: 'A 14-day trial will begin and the client becomes active in onboarding.', confirmLabel: 'Start trial' },
    toast: { title: 'Trial started', msg: '14-day trial is now active.' } },
  activate: { key: 'activate', label: 'Activate', icon: Icon.checkCircle, perm: 'clients.activate', variant: 'primary',
    confirm: { title: 'Activate this client?', message: 'The subscription becomes active and billing begins on the current plan.', confirmLabel: 'Activate' },
    toast: { title: 'Client activated', msg: 'Subscription is now active.' } },
  suspend: { key: 'suspend', label: 'Suspend', icon: Icon.pause, perm: 'clients.suspend', variant: 'default', danger: true,
    confirm: { title: 'Suspend this client?', message: 'Users will lose access until reinstated. This is reversible. The action is logged.', confirmLabel: 'Suspend client' },
    toast: { title: 'Client suspended', msg: 'Access has been revoked.', kind: 'info' } },
  reinstate: { key: 'reinstate', label: 'Reinstate', icon: Icon.play, perm: 'clients.reinstate', variant: 'primary',
    confirm: { title: 'Reinstate this client?', message: 'Access will be restored immediately on the existing plan.', confirmLabel: 'Reinstate' },
    toast: { title: 'Client reinstated', msg: 'Access restored.' } },
  cancel: { key: 'cancel', label: 'Cancel', icon: Icon.ban, perm: 'clients.cancel', variant: 'default', danger: true,
    confirm: { title: 'Cancel this subscription?', message: 'The subscription will be cancelled at period end. Data is retained for 90 days.', confirmLabel: 'Cancel subscription' },
    toast: { title: 'Subscription cancelled', msg: 'Cancels at period end.', kind: 'info' } },
};

const BY_STATUS: Record<string, ClientStatusAction[]> = {
  trial: ['activate', 'cancel'],
  active: ['suspend', 'cancel'],
  suspended: ['reinstate', 'cancel'],
  cancelled: ['start_trial'],
};

export function ClientActions({ client }: { client: Client }): React.ReactElement {
  const { can } = useAuth();
  const toast = useToast();
  const statusMut = useSetClientStatus(client.id);
  const planMut = useChangeClientPlan(client.id);
  const [confirm, setConfirm] = useState<ActionDef | null>(null);
  const [planOpen, setPlanOpen] = useState(false);

  const fire = (a: ActionDef) =>
    statusMut.mutate(a.key, {
      onSuccess: () => toast({ kind: a.toast.kind ?? 'success', title: a.toast.title, msg: a.toast.msg }),
      onError: (e) => toast({ kind: 'error', title: 'Action failed', msg: (e as ApiError).message }),
    });

  const onClick = (a: ActionDef) => { if (a.confirm) setConfirm(a); else fire(a); };

  const keys = BY_STATUS[client.status] ?? [];
  const showChangePlan = (client.status === 'trial' || client.status === 'active') && can('clients.change_plan');

  return (
    <div className="row gap8">
      {showChangePlan && (
        <Btn variant="default" icon={Icon.plans} disabled={planMut.isPending} onClick={() => setPlanOpen(true)}>Change plan</Btn>
      )}
      {keys.filter(k => can(ACTIONS[k].perm)).map(k => {
        const a = ACTIONS[k];
        return (
          <Btn key={k} variant={a.variant} icon={a.icon} disabled={statusMut.isPending} onClick={() => onClick(a)}>
            {a.label}
          </Btn>
        );
      })}

      {confirm && (
        <ConfirmDialog open onClose={() => setConfirm(null)} onConfirm={() => fire(confirm)}
          title={confirm.confirm!.title} message={confirm.confirm!.message}
          confirmLabel={confirm.confirm!.confirmLabel} danger={confirm.danger} />
      )}

      <ChangePlanModal open={planOpen} onClose={() => setPlanOpen(false)} client={client}
        onPick={(planId) => planMut.mutate(planId, {
          onSuccess: () => toast({ kind: 'success', title: 'Plan updated', msg: 'The subscription plan was changed.' }),
          onError: (e) => toast({ kind: 'error', title: 'Plan change failed', msg: (e as ApiError).message }),
        })} />
    </div>
  );
}

function ChangePlanModal({ open, onClose, client, onPick }:
  { open: boolean; onClose: () => void; client: Client; onPick: (planId: string) => void }) {
  const { data } = usePlans();
  const plans: Plan[] = data?.data ?? [];
  const [sel, setSel] = useState(client.plan_id);
  React.useEffect(() => { setSel(client.plan_id); }, [client.plan_id, open]);

  return (
    <Modal open={open} onClose={onClose}>
      <div className="modal-head">
        <div className="mh-ic" style={{ background: 'var(--accent-ghost)', color: 'var(--accent)' }}><Icon.plans size={19} /></div>
        <div className="mh-text"><h3>Change plan</h3><p>{client.name}</p></div>
      </div>
      <div className="modal-body">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, padding: '8px 0' }}>
          {plans.map(p => (
            <button key={p.id} onClick={() => setSel(p.id)} style={{ textAlign: 'left', padding: '13px 15px', borderRadius: 11,
              border: '1.5px solid ' + (sel === p.id ? 'var(--accent)' : 'var(--border)'),
              background: sel === p.id ? 'var(--accent-ghost)' : 'var(--surface-2)', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: p.color }} />
              <div className="f1">
                <div style={{ fontWeight: 650, fontSize: 14 }}>{p.name}{client.plan_id === p.id && <span className="tiny muted" style={{ fontWeight: 500 }}>  · current</span>}</div>
                <div className="tiny muted">{fmt.num(p.limits.students)} students · {fmt.num(p.limits.staff)} staff</div>
              </div>
              <div className="mono" style={{ fontWeight: 700 }}>{fmt.money(p.price)}<span className="tiny muted">/mo</span></div>
            </button>
          ))}
        </div>
      </div>
      <div className="modal-foot">
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" disabled={sel === client.plan_id} onClick={() => { onPick(sel); onClose(); }}>Update plan</Btn>
      </div>
    </Modal>
  );
}
