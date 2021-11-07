import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Anki, ImageModel, AudioClip, humanReadableTime } from '@project/common';
import { createTheme } from './theme';
import { ThemeProvider } from '@material-ui/core/styles';
import Alert from '@material-ui/lab/Alert';
import AnkiDialog from './AnkiDialog';
import CssBaseline from '@material-ui/core/CssBaseline';
import ImageDialog from './ImageDialog';
import Snackbar from '@material-ui/core/Snackbar';

export default function AnkiUi({ bridge, mp3WorkerUrl }) {
    const [open, setOpen] = useState(false);
    const [disabled, setDisabled] = useState(false);
    const [id, setId] = useState();
    const [subtitle, setSubtitle] = useState();
    const [text, setText] = useState('');
    const [audioClip, setAudioClip] = useState();
    const [serializedAudio, setSerializedAudio] = useState();
    const [image, setImage] = useState();
    const [serializedImage, setSerializedImage] = useState();
    const [imageDialogOpen, setImageDialogOpen] = useState(false);
    const [source, setSource] = useState();
    const [sliderContext, setSliderContext] = useState();
    const [definition, setDefinition] = useState('');
    const [word, setWord] = useState('');
    const [customFieldValues, setCustomFieldValues] = useState({});
    const [timestampInterval, setTimestampInterval] = useState();
    const [lastAppliedTimestampIntervalToText, setLastAppliedTimestampIntervalToText] = useState();
    const [settingsProvider, setSettingsProvider] = useState({ customAnkiFields: {} });
    const [alertSeverity, setAlertSeverity] = useState();
    const [alertOpen, setAlertOpen] = useState(false);
    const [alert, setAlert] = useState();
    const [themeType, setThemeType] = useState('dark');
    const theme = useMemo(() => createTheme(themeType), [themeType]);
    const anki = useMemo(() => new Anki(settingsProvider, bridge), [settingsProvider, bridge]);

    useEffect(() => {
        return bridge.onStateUpdated((state) => {
            let audioClip;

            if (state.type === 'initial') {
                setText(state.subtitle.text);
                setSubtitle(state.subtitle);
                setTimestampInterval(null);
                setSliderContext({
                    subtitleStart: state.subtitle.start,
                    subtitleEnd: state.subtitle.end,
                    subtitles: state.surroundingSubtitles || [
                        {
                            start: state.subtitle.start,
                            end: state.subtitle.end,
                            text: state.subtitle.text,
                            track: state.subtitle.track,
                        },
                    ],
                });
                setSource(`${state.source} (${humanReadableTime(state.subtitle.start)})`);
                setDefinition('');
                setWord('');
                setCustomFieldValues({});
                setLastAppliedTimestampIntervalToText();

                if (state.audio) {
                    audioClip = AudioClip.fromBase64(
                        state.source,
                        Math.max(0, state.subtitle.start - state.audio.paddingStart),
                        state.subtitle.end + state.audio.paddingEnd,
                        state.audio.base64,
                        state.audio.extension
                    );
                }
            } else if (state.type === 'resume') {
                setText(state.text);
                setTimestampInterval(state.timestampInterval);
                setSliderContext(state.sliderContext);
                setSource(state.source);
                setDefinition(state.definition);
                setWord(state.word);
                setCustomFieldValues(state.customFieldValues);
                setLastAppliedTimestampIntervalToText(state.lastAppliedTimestampIntervalToText);

                if (state.audio) {
                    audioClip = AudioClip.fromBase64(
                        state.source,
                        Math.max(0, state.audio.start - state.audio.paddingStart),
                        state.audio.end + state.audio.paddingEnd,
                        state.audio.base64,
                        state.audio.extension
                    );
                }
            }

            if (audioClip && state.settingsProvider.preferMp3) {
                audioClip = audioClip.toMp3(() => new Worker(mp3WorkerUrl));
            }

            let image;

            if (state.image) {
                image = Image.fromBase64(state.source, state.subtitle.start, state.image.base64, state.image.extension);
            }

            setSerializedAudio(state.audio);
            setSerializedImage(state.image);
            setImageDialogOpen(false);
            setDisabled(false);
            setSettingsProvider(state.settingsProvider);
            setId(state.id);
            setAudioClip(audioClip);
            setImage(image);
            setThemeType(state.themeType || 'dark');
            setOpen(state.open);
        });
    }, [bridge, mp3WorkerUrl]);

    const handleProceed = useCallback(
        async (text, definition, audioClip, image, word, source, customFieldValues, mode) => {
            setDisabled(true);

            try {
                const result = await anki.export(
                    text,
                    definition,
                    audioClip,
                    image,
                    word,
                    source,
                    customFieldValues,
                    mode
                );

                if (mode !== 'gui') {
                    setOpen(false);
                    setImageDialogOpen(false);
                    bridge.finished({ command: 'resume' });
                }
            } catch (e) {
                console.error(e);
                setAlertSeverity('error');
                setAlert(e.message);
                setAlertOpen(true);
            } finally {
                setDisabled(false);
            }
        },
        [anki, bridge]
    );

    const handleCancel = useCallback(() => {
        setOpen(false);
        setImageDialogOpen(false);
        bridge.finished({ command: 'resume' });
    }, [bridge]);

    const handleViewImage = useCallback((image) => {
        setImage(image);
        setImageDialogOpen(true);
    }, []);

    const handleRerecord = useCallback(
        ({
            text,
            sliderContext,
            definition,
            word,
            source,
            customFieldValues,
            timestampInterval,
            lastAppliedTimestampIntervalToText,
        }) => {
            setOpen(false);
            setImageDialogOpen(false);
            bridge.finished({
                command: 'rerecord',
                uiState: {
                    subtitle: subtitle,
                    text: text,
                    sliderContext: sliderContext,
                    definition: definition,
                    image: serializedImage,
                    word: word,
                    source: source,
                    customFieldValues: customFieldValues,
                    timestampInterval: timestampInterval,
                    lastAppliedTimestampIntervalToText: lastAppliedTimestampIntervalToText,
                },
                id: id,
                recordStart: timestampInterval[0],
                recordEnd: timestampInterval[1],
            });
        },
        [serializedImage, subtitle, id]
    );

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <Snackbar
                anchorOrigin={{ horizontal: 'center', vertical: 'top' }}
                open={alertOpen}
                autoHideDuration={5000}
                onClose={() => setAlertOpen(false)}
            >
                <Alert onClose={() => setAlertOpen(false)} severity={alertSeverity}>
                    {alert}
                </Alert>
            </Snackbar>
            <ImageDialog open={imageDialogOpen} image={image} onClose={() => setImageDialogOpen(false)} />
            <AnkiDialog
                open={open}
                disabled={disabled}
                text={text}
                sliderContext={sliderContext}
                audioClip={audioClip}
                image={image}
                source={source}
                settingsProvider={settingsProvider}
                anki={anki}
                onProceed={handleProceed}
                onRerecord={handleRerecord}
                onCancel={handleCancel}
                onViewImage={handleViewImage}
                definition={definition}
                word={word}
                customFieldValues={customFieldValues}
                timestampInterval={timestampInterval}
                lastAppliedTimestampIntervalToText={lastAppliedTimestampIntervalToText}
            />
        </ThemeProvider>
    );
}
