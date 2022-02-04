/* eslint-disable @typescript-eslint/no-explicit-any */
// import { LitElement, html, TemplateResult, css, CSSResult  } from 'lit';
// import { HomeAssistant, fireEvent, LovelaceCardEditor,  } from 'custom-card-helpers';
// import { guard } from 'lit-html/directives/guard';
import { SonosCardConfig } from './types';
import { customElement, property, state } from 'lit/decorators';
// import Sortable, { AutoScroll, OnSpill, SortableEvent } from 'sortablejs/modular/sortable.core.esm';


import { fireEvent, HomeAssistant, LovelaceCardEditor } from 'custom-card-helpers';
import { css, CSSResult, html, LitElement, TemplateResult } from 'lit-element';
import { guard } from 'lit-html/directives/guard';


@customElement('sonos-card-editor')
export class SonosCardEditor extends LitElement implements LovelaceCardEditor {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ attribute: false }) public _entities!: string[];
  @property({ attribute: false }) public selectedEntity!: string;
  private _config!: SonosCardConfig;

  public setConfig(config: SonosCardConfig): void {
    this._config = config;
    this._entities = (config.entities.length > 0) ? config.entities : [];
  }


  get _name(): string {
    return this._config?.name || '';
  }

  protected shouldUpdate(): boolean {
    return true
  }

  /**
   * Generator for all entities in the config.entities list
   * The Guard Function prevents unnecessary rendering
   * @returns HTML for the Entities Editor
   */
  render(): TemplateResult {
    const includeDomains = ["media_player"];
    return html`
    <paper-input
          type="text"
          .label="${this.hass.localize(
            "ui.panel.lovelace.editor.card.generic.name"
          )} (${this.hass.localize(
            "ui.panel.lovelace.editor.card.config.optional"
          )})"
          .value="${this._name}"
          .configValue=${"name"}
          @value-changed="${this._valueChanged}"
        ></paper-input>
      <h3>
        Entities (Required)
      </h3>
      <div class="entities">
          ${guard([this._entities], () =>
            this._entities.map((entity, index) => {
              return html`
                <div class="entity">
                  <ha-entity-picker
                    label="Entity"
                    allow-custom-entity
                    hideClearIcon
                    .hass=${this.hass}
                    .configValue=${'entity'}
                    .value=${entity}
                    .includeDomains=${includeDomains}
                    .index=${index}
                    @value-changed=${this._editRow}
                  ></ha-entity-picker>
                  <mwc-icon-button
                    aria-label="Remove"
                    class="remove-icon"
                    .index=${index}
                    @click=${this._removeRow}
                  >
                    <ha-icon icon="mdi:close"></ha-icon>
                  </mwc-icon-button>
                </div>
              `;
            })
          )}
        </div>
      </div>
      <ha-entity-picker
        .hass=${this.hass}
        @value-changed=${this._addEntity}
        .value=${this.selectedEntity}
        .includeDomains=${includeDomains}
      ></ha-entity-picker>
    `;
  }

  private _valueChanged(ev): void {
    if (!this._config || !this.hass) {
      return;
    }
    if (ev.target) {
      const target = ev.target;
      if (target.configValue) {
        if (target.value === '') {
          delete this._config[target.configValue];
        } else {
          this._config = {
            ...this._config,
            [target.configValue]: target.checked !== undefined ? target.checked : target.value,
          };
        }
      }
    }
    fireEvent(this, 'config-changed', { config: this._config });
  }


  /**
   * If you add an entity it needs to be appended to the Configuration!
   * In this particular Case the Entity Generation is a bit more complicated and involves Presets
   */
  private async _addEntity(ev): Promise<void> {
    const value: string = ev.detail.value;
    this.selectedEntity = '';
    if (value === '') {
      return;
    }

    const newEntities = this._entities.concat(value);
    //This basically fakes a event object
    this._valueChanged({ target: { configValue: 'entities', value: newEntities } });
    console.log(this.selectedEntity)
  }
  /**
   * When the Row is removed:
   * @param ev Event containing a Target to remove
   */
  private _removeRow(ev): void {
    const index = ev.currentTarget?.index || 0;
    const newEntities = [...this._entities];
    newEntities.splice(index, 1);

    this._valueChanged({ target: { configValue: 'entities', value: newEntities } });
  }
  /**
   * When the Row is edited:
   * @param ev Event containing a Target to remove
   */
  private _editRow(ev): void {
    const index = ev.currentTarget?.index || 0;

    const newEntities = [...this._entities];
    newEntities[index] = ev.detail.value;

    this._valueChanged({ target: { configValue: 'entities', value: newEntities } });
  }

  /**
   * The Second Part comes from here: https://github.com/home-assistant/frontend/blob/dev/src/resources/ha-sortable-style.ts
   * @returns Editor CSS
   */
  static get styles(): CSSResult[] {
    return [
      css`
        .side-by-side {
          display: flex;
        }
        .side-by-side > * {
          flex: 1 1 0%;
          padding-right: 4px;
        }
        .entity {
          display: flex;
          align-items: center;
        }
        .entity ha-entity-picker {
          flex-grow: 1;
        }
        .add-preset {
          padding-right: 8px;
          max-width: 130px;
        }
        .add-icon {
          --mdc-icon-button-size: 36px;
          color: var(--secondary-text-color);
        }
        .secondary {
          font-size: 12px;
          color: var(--secondary-text-color);
        }
      `,
    ];
  }
}
